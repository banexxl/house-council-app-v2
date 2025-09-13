'use server';

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Announcement } from 'src/types/announcement';
import { BaseNotification } from 'src/types/notification';
import { validate as isUUID } from 'uuid';
import { toStorageRef } from 'src/utils/sb-bucket';

// Table names (adjust if different in your DB schema)
const ANNOUNCEMENTS_TABLE = 'tblAnnouncements';
const ANNOUNCEMENT_IMAGES_TABLE = 'tblAnnouncementImages';
const ANNOUNCEMENT_DOCUMENTS_TABLE = 'tblAnnouncementDocuments';
const NOTIFICATIONS_TABLE = 'tblNotifications';
const BUILDINGS_NOTIFICATIONS_PIVOT_TABLE = 'tblBuildings_Notifications';
const ANNOUNCEMENT_BUILDINGS_PIVOT_TABLE = 'tblBuildings_Announcements';

// ===== Signing helpers (internal) =====
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h
const DEFAULT_BUCKET = process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;

type Ref = { bucket: string; path: string };

function makeRef(
     bucketMaybe: string | null | undefined,
     pathMaybe: string | null | undefined,
     legacyUrl?: string | null
): Ref | null {
     if (pathMaybe) return { bucket: bucketMaybe ?? DEFAULT_BUCKET, path: pathMaybe };
     if (legacyUrl) {
          const parsed = toStorageRef(legacyUrl);
          if (parsed) return parsed;
     }
     return null;
}

async function signMany(
     supabase: Awaited<ReturnType<typeof useServerSideSupabaseAnonClient>>,
     refs: Ref[]
) {
     const out = new Map<string, string>();
     if (!refs?.length) return out;

     // Group & dedupe by bucket
     const byBucket = new Map<string, string[]>();
     for (const r of refs) {
          const arr = byBucket.get(r.bucket) ?? [];
          if (!arr.includes(r.path)) arr.push(r.path);
          byBucket.set(r.bucket, arr);
     }

     for (const [bucket, paths] of byBucket) {
          if (!paths.length) continue;
          const { data, error } = await supabase.storage
               .from(bucket)
               .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
          if (error || !data) continue;
          data.forEach((d, i) => {
               if (d?.signedUrl) out.set(`${bucket}::${paths[i]}`, d.signedUrl);
          });
     }

     return out;
}

// ============================= READ OPERATIONS =============================
export async function getAnnouncements(): Promise<{ success: boolean; error?: string; data?: Announcement[] }> {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase
          .from(ANNOUNCEMENTS_TABLE)
          .select('*')
          .order('created_at', { ascending: false });

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'getAnnouncements',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: {},
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }

     let enriched: Announcement[] = data as Announcement[];

     // ---- Enrich with signed images + docs + buildings (best effort) ----
     try {
          const ids = enriched.map(a => a.id).filter(Boolean) as string[];
          if (ids.length > 0) {
               // Images + Docs (new columns + legacy)
               const [{ data: imgRows }, { data: docRows }] = await Promise.all([
                    supabase
                         .from(ANNOUNCEMENT_IMAGES_TABLE)
                         .select('announcement_id, storage_bucket, storage_path')
                         .in('announcement_id', ids),
                    supabase
                         .from(ANNOUNCEMENT_DOCUMENTS_TABLE)
                         .select('announcement_id, storage_bucket, storage_path, file_name, mime_type')
                         .in('announcement_id', ids),
               ]);

               // Build refs to sign
               const imageRefs: Ref[] = (imgRows ?? [])
                    .map(r =>
                         makeRef((r as any).storage_bucket, (r as any).storage_path)
                    )
                    .filter(Boolean) as Ref[];

               const docRefs: Ref[] = (docRows ?? [])
                    .map(r =>
                         makeRef((r as any).storage_bucket, (r as any).storage_path, (r as any).document_url)
                    )
                    .filter(Boolean) as Ref[];

               const signedMap = await signMany(supabase, [...imageRefs, ...docRefs]);

               // Map announcement_id → signed image urls
               const imagesMap = new Map<string, string[]>();
               for (const r of imgRows ?? []) {
                    const bucket = (r as any).storage_bucket ?? DEFAULT_BUCKET;
                    const path = (r as any).storage_path;
                    let key: string | null = null;

                    if (path) key = `${bucket}::${path}`;

                    if (!key) continue;
                    const signed = signedMap.get(key);
                    if (!signed) continue;

                    const annId = (r as any).announcement_id as string;
                    const arr = imagesMap.get(annId) ?? [];
                    arr.push(signed);
                    imagesMap.set(annId, arr);
               }

               // Map announcement_id → signed doc items
               const docsMap = new Map<string, { url: string; name: string; mime?: string }[]>();
               for (const r of docRows ?? []) {
                    const bucket = (r as any).storage_bucket ?? DEFAULT_BUCKET;
                    const path = (r as any).storage_path;
                    let key: string | null = null;

                    if (path) key = `${bucket}::${path}`;
                    else if ((r as any).document_url) {
                         const parsed = toStorageRef((r as any).document_url);
                         if (parsed) key = `${parsed.bucket}::${parsed.path}`;
                    }

                    if (!key) continue;
                    const signed = signedMap.get(key);
                    if (!signed) continue;

                    const annId = (r as any).announcement_id as string;
                    const item = {
                         url: signed,
                         name: (r as any).file_name as string,
                         mime: ((r as any).mime_type as string) || undefined,
                    };
                    const arr = docsMap.get(annId) ?? [];
                    arr.push(item);
                    docsMap.set(annId, arr);
               }

               // Attach to each announcement
               enriched = enriched.map(a => ({
                    ...a,
                    images: imagesMap.get(a.id!) || [],
                    documents: docsMap.get(a.id!) || [],
               }));

               // Buildings enrichment (many-to-many pivot) — unchanged
               try {
                    const { data: buildingRows, error: bErr } = await supabase
                         .from(ANNOUNCEMENT_BUILDINGS_PIVOT_TABLE)
                         .select('announcement_id,building_id')
                         .in('announcement_id', ids);
                    if (!bErr && buildingRows) {
                         const bMap = new Map<string, string[]>();
                         for (const row of buildingRows as any[]) {
                              const annId = row.announcement_id as string;
                              const bId = row.building_id as string;
                              if (!bMap.has(annId)) bMap.set(annId, []);
                              bMap.get(annId)!.push(bId);
                         }
                         enriched = enriched.map(a => ({ ...a, buildings: bMap.get(a.id!) || [] }));
                    }
               } catch { /* ignore buildings enrichment errors */ }
          }
     } catch { /* ignore enrichment errors */ }

     await logServerAction({
          user_id: null,
          action: 'getAnnouncements',
          duration_ms: Date.now() - time,
          error: '',
          payload: { count: enriched.length },
          status: 'success',
          type: 'db',
     });
     return { success: true, data: enriched };
}

// Single by ID, with enrichment
export async function getAnnouncementById(id: string): Promise<{ success: boolean; error?: string; data?: Announcement }> {
     const time = Date.now();
     if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };

     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.from(ANNOUNCEMENTS_TABLE).select('*').eq('id', id).single();

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'getAnnouncementById',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id },
               status: 'fail',
               type: 'db',
               id: '',
          });
          return { success: false, error: error.message };
     }

     // ---- Fetch & sign related images, documents, and buildings ----
     let images: string[] = [];
     let documents: { url: string; name: string; mime?: string }[] = [];
     let buildings: string[] = [];

     try {
          const [{ data: imgRows }, { data: docRows }] = await Promise.all([
               supabase
                    .from(ANNOUNCEMENT_IMAGES_TABLE)
                    .select('storage_bucket, storage_path')
                    .eq('announcement_id', id),
               supabase
                    .from(ANNOUNCEMENT_DOCUMENTS_TABLE)
                    .select('storage_bucket, storage_path, file_name, mime_type')
                    .eq('announcement_id', id),
          ]);

          // Build refs (dedupe) and sign
          const imgRefs: Array<{ bucket: string; path: string }> = [];
          const seen = new Set<string>();
          for (const r of imgRows ?? []) {
               const bucket = (r as any).storage_bucket
               const path = (r as any).storage_path as string | null;
               if (!path) continue;
               const key = `${bucket}::${path}`;
               if (seen.has(key)) continue;
               seen.add(key);
               imgRefs.push({ bucket, path });
          }

          const docEntries: Array<{ bucket: string; path: string; name: string; mime?: string | null }> = [];
          for (const r of docRows ?? []) {
               const bucket = (r as any).storage_bucket
               const path = (r as any).storage_path as string | null;
               if (!path) continue;
               docEntries.push({
                    bucket,
                    path,
                    name: (r as any).file_name as string,
                    mime: ((r as any).mime_type as string) || null,
               });
          }

          const signedMap = await signMany(supabase, [...imgRefs, ...docEntries.map(d => ({ bucket: d.bucket, path: d.path }))]);

          images = imgRefs
               .map(ref => signedMap.get(`${ref.bucket}::${ref.path}`))
               .filter(Boolean) as string[];

          documents = docEntries
               .map(d => {
                    const url = signedMap.get(`${d.bucket}::${d.path}`);
                    return url ? { url, name: d.name, mime: d.mime || undefined } : null;
               })
               .filter(Boolean) as { url: string; name: string; mime?: string }[];

          // Buildings (unchanged)
          try {
               const { data: buildingRows } = await supabase
                    .from(ANNOUNCEMENT_BUILDINGS_PIVOT_TABLE)
                    .select('building_id')
                    .eq('announcement_id', id);
               buildings = (buildingRows || []).map(r => (r as any).building_id);
          } catch { /* noop */ }
     } catch { /* noop */ }

     await logServerAction({
          user_id: null,
          action: 'getAnnouncementById',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id },
          status: 'success',
          type: 'db',
          id: '',
     });

     const record: Announcement = { ...(data as any), images, documents, buildings };

     return { success: true, data: record };
}


// ============================= CREATE / UPDATE =============================
export async function upsertAnnouncement(input: Partial<Announcement> & { id?: string }): Promise<{ success: boolean; error?: string; data?: Announcement }> {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const now = new Date();
     const isUpdate = !!input.id;
     const record: any = { ...input };

     const buildingIdsInput = Array.isArray(record.buildings)
          ? [...new Set(record.buildings.filter((id: any) => typeof id === 'string'))]
          : [];
     delete record.buildings;

     if (isUpdate) {
          record.updated_at = now;
     } else {
          record.created_at = now;
          record.updated_at = now;
          if (record.status === 'draft') {
               record.published_at = now;
          } else {
               record.published_at = null;
          }
     }

     const { data, error } = await supabase
          .from(ANNOUNCEMENTS_TABLE)
          .upsert(record, { onConflict: 'id' })
          .select()
          .maybeSingle<Announcement>();

     if (error) {
          await logServerAction({
               action: isUpdate ? 'updateAnnouncement' : 'createAnnouncement',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: input,
               status: 'fail',
               type: 'db',
               user_id: null,
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          user_id: null,
          action: isUpdate ? 'updateAnnouncement' : 'createAnnouncement',
          duration_ms: Date.now() - time,
          error: '',
          payload: input,
          status: 'success',
          type: 'db',
     });

     // Sync buildings pivot table (best-effort; log error but don't fail the whole request)
     if (data && buildingIdsInput) {
          const announcementId = (data as any).id;
          try {
               // Clear existing links
               const { error: clearErr } = await supabase
                    .from(ANNOUNCEMENT_BUILDINGS_PIVOT_TABLE)
                    .delete()
                    .eq('announcement_id', announcementId);
               if (clearErr) {
                    await logServerAction({
                         user_id: null,
                         action: 'syncAnnouncementBuildings',
                         duration_ms: 0,
                         error: clearErr.message,
                         payload: { announcementId, buildingIds: buildingIdsInput },
                         status: 'fail',
                         type: 'db',
                    });
               }
               if (buildingIdsInput.length > 0) {
                    const pivotRows = buildingIdsInput.map(bid => ({ building_id: bid, announcement_id: announcementId }));
                    const { error: pivotErr } = await supabase.from(ANNOUNCEMENT_BUILDINGS_PIVOT_TABLE).insert(pivotRows);
                    if (pivotErr) {
                         await logServerAction({
                              user_id: null,
                              action: 'syncAnnouncementBuildings',
                              duration_ms: 0,
                              error: pivotErr.message,
                              payload: { announcementId, buildingIds: buildingIdsInput },
                              status: 'fail',
                              type: 'db',
                         });
                         return { success: false, error: pivotErr.message };
                    } else {
                         (data as any).buildings = buildingIdsInput;
                    }
               } else {
                    (data as any).buildings = [];
               }
          } catch (e: any) {
               await logServerAction({
                    user_id: null,
                    action: 'syncAnnouncementBuildingsUnexpected',
                    duration_ms: 0,
                    error: e?.message || 'unexpected',
                    payload: { announcementId, buildingIds: buildingIdsInput },
                    status: 'fail',
                    type: 'db',
               });
          }
     }

     // Create notification ONLY on new announcement insert (not on updates)
     if (!isUpdate && data) {
          try {
               const notification = {
                    type: 'announcement',
                    title: (data as any).title,
                    description: (data as any).title || 'A new announcement was created',
                    created_at: new Date(),
                    user_id: (data as any)?.user_id ?? null,
                    is_read: false,
               } as BaseNotification;

               const { error: notificationError, data: notificationData } = await supabase
                    .from(NOTIFICATIONS_TABLE)
                    .insert(notification)
                    .select()

               if (notificationError) {
                    logServerAction({
                         user_id: null,
                         action: 'createAnnouncementNotification',
                         duration_ms: 0,
                         error: notificationError.message,
                         payload: { notification },
                         status: 'fail',
                         type: 'db',
                    })
                    return { success: false, error: notificationError.message }
               }
               // Insert into pivot table tblBuildings_Notifications
               if (notificationData && notificationData[0] && buildingIdsInput.length > 0) {
                    const { error: pivotError } = await supabase.from(BUILDINGS_NOTIFICATIONS_PIVOT_TABLE).insert(
                         buildingIdsInput.map(bid => ({
                              building_id: bid,
                              notification_id: notificationData[0].id!,
                         }))
                    );
                    if (pivotError) {
                         logServerAction({
                              user_id: null,
                              action: 'createAnnouncementNotificationPivot',
                              duration_ms: 0,
                              error: pivotError.message,
                              payload: { buildingIds: buildingIdsInput, notificationId: notificationData[0].id },
                              status: 'fail',
                              type: 'db',
                         });
                         return { success: false, error: pivotError.message };
                    }
               }
          } catch {
               return { success: false }; // best effort
          }
     }

     revalidatePath('/dashboard/announcements');
     return { success: true, data: data as Announcement };
}

// ============================= DELETE/ARCHIVE =============================
export async function deleteAnnouncement(id: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { error } = await supabase.from(ANNOUNCEMENTS_TABLE).delete().eq('id', id);
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null).catch(() => null);
     if (error) {
          await logServerAction({
               user_id: user_id ? user_id : null,
               action: 'deleteAnnouncement',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }
     await logServerAction({
          user_id: user_id ? user_id : null,
          action: 'deleteAnnouncement',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id },
          status: 'success',
          type: 'db',
     });
     // Fire-and-forget notification about deletion
     try {
          const notification = {
               type: 'announcement',
               title: 'Announcement deleted',
               description: `Announcement ${id} was deleted`,
               created_at: new Date(),
               user_id: user_id ? user_id : null,
               is_read: false,
          } as BaseNotification;
          const { error: notificationError } = await supabase.from(NOTIFICATIONS_TABLE).insert(notification);
     } catch { /* best effort */ }
     revalidatePath('/dashboard/announcements');
     return { success: true, data: null };
}

export async function archiveAnnouncement(id: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null).catch(() => null);
     const { error } = await supabase.from(ANNOUNCEMENTS_TABLE).update({ archived: true, updated_at: new Date() }).eq('id', id);
     if (error) {
          await logServerAction({
               user_id: user_id ? user_id : null,
               action: 'archiveAnnouncement',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }
     await logServerAction({
          user_id: user_id ? user_id : null,
          action: 'archiveAnnouncement',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id },
          status: 'success',
          type: 'db',
     });
     revalidatePath('/dashboard/announcements');
     return { success: true };
}

// ============================= PIN =============================
export async function togglePinAction(id: string, pinned: boolean) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null).catch(() => null);
     const { error } = await supabase.from(ANNOUNCEMENTS_TABLE).update({ pinned, updated_at: new Date() }).eq('id', id);
     if (error) {
          await logServerAction({
               user_id: user_id ? user_id : null,
               action: 'togglePinAnnouncement',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id, pinned },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }
     await logServerAction({
          user_id: user_id ? user_id : null,
          action: 'togglePinAnnouncement',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id, pinned },
          status: 'success',
          type: 'db',
     });
     revalidatePath('/dashboard/announcements');
     return { success: true };
}

// ============================= PUBLISH STATUS CHANGE =============================
export async function publishAnnouncement(id: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null).catch(() => null);
     const now = new Date();
     const { error } = await supabase.from(ANNOUNCEMENTS_TABLE).update({ status: 'published', published_at: now, updated_at: now }).eq('id', id);
     if (error) {
          await logServerAction({
               user_id: user_id ? user_id : null,
               action: 'publishAnnouncement',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }
     await logServerAction({
          user_id: user_id ? user_id : null,
          action: 'publishAnnouncement',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id },
          status: 'success',
          type: 'db',
     });
     revalidatePath('/dashboard/announcements');
     return { success: true };
}

export async function revertToDraft(id: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null).catch(() => null);
     const { error } = await supabase.from(ANNOUNCEMENTS_TABLE).update({ status: 'draft', published_at: null, updated_at: new Date() }).eq('id', id);
     if (error) {
          await logServerAction({
               user_id: user_id ? user_id : null,
               action: 'revertAnnouncementToDraft',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }
     await logServerAction({
          user_id: null,
          action: 'revertAnnouncementToDraft',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id },
          status: 'success',
          type: 'db',
     });
     revalidatePath('/dashboard/announcements');
     return { success: true };
}

// ============================= ARCHIVE / UNARCHIVE =============================
export async function toggleArchiveAction(id: string, archived: boolean) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null).catch(() => null);
     const { error } = await supabase.from(ANNOUNCEMENTS_TABLE).update({ archived, updated_at: new Date() }).eq('id', id);
     if (error) {
          await logServerAction({
               user_id: user_id ? user_id : null,
               action: 'toggleArchiveAnnouncement',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id, archived },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }
     await logServerAction({
          user_id: user_id ? user_id : null,
          action: 'toggleArchiveAnnouncement',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id, archived },
          status: 'success',
          type: 'db',
     });
     revalidatePath('/dashboard/announcements');
     return { success: true };
}
