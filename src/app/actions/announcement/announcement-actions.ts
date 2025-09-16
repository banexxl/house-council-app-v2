'use server';

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Announcement } from 'src/types/announcement';
import { BaseNotification } from 'src/types/notification';
import { validate as isUUID } from 'uuid';
import { toStorageRef } from 'src/utils/sb-bucket';
import { readAllTenantsFromBuildingIds } from '../tenant/tenant-actions';

// Table names (adjust if different in your DB schema)
const ANNOUNCEMENTS_TABLE = 'tblAnnouncements';
const ANNOUNCEMENT_IMAGES_TABLE = 'tblAnnouncementImages';
const ANNOUNCEMENT_DOCUMENTS_TABLE = 'tblAnnouncementDocuments';
const NOTIFICATIONS_TABLE = 'tblNotifications';
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

// Published announcements for given building ids (with enrichment) – tenant consumption
export async function getPublishedAnnouncementsForBuildings(buildingIds: string[]): Promise<{ success: boolean; error?: string; data?: Announcement[]; buildings?: Record<string, any> }> {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     if (!Array.isArray(buildingIds) || buildingIds.length === 0) return { success: true, data: [], buildings: {} };

     try {
          // 1) Pivot to announcement ids
          const { data: pivotRows, error: pivotErr } = await supabase
               .from(ANNOUNCEMENT_BUILDINGS_PIVOT_TABLE)
               .select('announcement_id, building_id')
               .in('building_id', buildingIds);
          if (pivotErr) return { success: false, error: pivotErr.message };

          const annIds = Array.from(new Set((pivotRows || []).map(r => (r as any).announcement_id))).filter(Boolean);
          if (annIds.length === 0) return { success: true, data: [], buildings: {} };

          // 2) Fetch announcements in bulk (filter published)
          const { data: annRows, error: annErr } = await supabase
               .from(ANNOUNCEMENTS_TABLE)
               .select('*')
               .in('id', annIds)
               .eq('status', 'published')
               .order('created_at', { ascending: false });
          if (annErr) return { success: false, error: annErr.message };

          let enriched: Announcement[] = annRows as any as Announcement[];

          // 3) Attach building arrays per announcement from pivot
          const annToBuildings = new Map<string, string[]>();
          for (const pr of (pivotRows || []) as any[]) {
               const aId = pr.announcement_id as string; const bId = pr.building_id as string;
               if (!annToBuildings.has(aId)) annToBuildings.set(aId, []);
               if (!annToBuildings.get(aId)!.includes(bId)) annToBuildings.get(aId)!.push(bId);
          }

          // 4) Media enrichment (reuse logic: fetch images + documents for annIds)
          try {
               const [{ data: imgRows }, { data: docRows }] = await Promise.all([
                    supabase
                         .from(ANNOUNCEMENT_IMAGES_TABLE)
                         .select('announcement_id, storage_bucket, storage_path')
                         .in('announcement_id', annIds),
                    supabase
                         .from(ANNOUNCEMENT_DOCUMENTS_TABLE)
                         .select('announcement_id, storage_bucket, storage_path, file_name, mime_type')
                         .in('announcement_id', annIds),
               ]);

               const imageRefs: Ref[] = (imgRows || []).map(r => makeRef((r as any).storage_bucket, (r as any).storage_path)).filter(Boolean) as Ref[];
               const docRefs: Ref[] = (docRows || []).map(r => makeRef((r as any).storage_bucket, (r as any).storage_path, (r as any).document_url)).filter(Boolean) as Ref[];
               const signedMap = await signMany(supabase, [...imageRefs, ...docRefs]);

               const imagesMap = new Map<string, string[]>();
               for (const r of (imgRows || []) as any[]) {
                    const bucket = r.storage_bucket ?? DEFAULT_BUCKET; const path = r.storage_path; if (!path) continue;
                    const key = `${bucket}::${path}`; const signed = signedMap.get(key); if (!signed) continue;
                    const aId = r.announcement_id as string; const arr = imagesMap.get(aId) ?? []; arr.push(signed); imagesMap.set(aId, arr);
               }
               const docsMap = new Map<string, { url: string; name: string; mime?: string }[]>();
               for (const r of (docRows || []) as any[]) {
                    const bucket = r.storage_bucket ?? DEFAULT_BUCKET; const path = r.storage_path; if (!path) continue;
                    const key = `${bucket}::${path}`; const signed = signedMap.get(key); if (!signed) continue;
                    const aId = r.announcement_id as string;
                    const item = { url: signed, name: r.file_name as string, mime: (r.mime_type as string) || undefined };
                    const arr = docsMap.get(aId) ?? []; arr.push(item); docsMap.set(aId, arr);
               }

               enriched = enriched.map(a => ({
                    ...a,
                    buildings: annToBuildings.get(a.id) || [],
                    images: imagesMap.get(a.id) || [],
                    documents: docsMap.get(a.id) || [],
               }));
          } catch { /* ignore enrichment errors */ }

          // 5) Fetch building records (for label display)
          let buildingsMap: Record<string, any> = {};
          try {
               const uniqueBIds = Array.from(new Set(buildingIds));
               if (uniqueBIds.length > 0) {
                    const { data: bRows } = await supabase
                         .from('tblBuildings')
                         .select('id, building_location:tblBuildingLocations!tblBuildings_building_location_fkey (street_address, street_number, city)')
                         .in('id', uniqueBIds);
                    for (const b of (bRows || []) as any[]) buildingsMap[b.id] = b;
               }
          } catch { /* ignore building fetch errors */ }

          await logServerAction({
               user_id: null,
               action: 'getPublishedAnnouncementsForBuildings',
               duration_ms: Date.now() - time,
               error: '',
               payload: { count: enriched.length },
               status: 'success',
               type: 'db',
          });

          return { success: true, data: enriched, buildings: buildingsMap };
     } catch (e: any) {
          await logServerAction({
               user_id: null,
               action: 'getPublishedAnnouncementsForBuildings',
               duration_ms: Date.now() - time,
               error: e?.message || 'unexpected',
               payload: { buildingIdsLength: buildingIds.length },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: e?.message || 'Unexpected error' };
     }
}

// ============================= CREATE / UPDATE =============================
export async function upsertAnnouncement(
     input: Partial<Announcement> & { id?: string }
): Promise<{ success: boolean; error?: string; data?: Announcement }> {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const now = new Date();
     const isUpdate = !!input.id;
     const record: any = { ...input };

     const buildingIdsInput: string[] = Array.isArray(record.buildings)
          ? [...new Set(record.buildings.filter((id: any) => typeof id === 'string'))] as string[]
          : [];
     delete record.buildings;

     if (isUpdate) {
          record.updated_at = now;
     } else {
          record.created_at = now;
          record.updated_at = now;
          record.published_at = record.status === 'draft' ? null : now;
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

     // ---- Sync announcement <-> buildings pivot (unchanged) ----
     if (data && buildingIdsInput) {
          const announcementId = (data as any).id;
          try {
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
                    const pivotRows = buildingIdsInput.map((bid) => ({ building_id: bid, announcement_id: announcementId }));
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

     // ---- NEW: Create per-user notifications (only on create, not update) ----
     if (!isUpdate && data && buildingIdsInput.length > 0) {
          const announcementId = (data as any).id;
          try {
               // 1) Resolve all user_ids that belong to any of the selected buildings
               const { data: userIds } = await readAllTenantsFromBuildingIds(buildingIdsInput);

               if (userIds && userIds.length === 0) {
                    // Nothing to notify (not an error)
                    revalidatePath('/dashboard/');
                    return { success: true, data: data as Announcement };
               }

               // 2) Build rows (one per user). We keep per-user read state via is_read=false initially.
               const baseTitle = (data as any).title ?? 'New announcement';
               const baseDescription = (data as any).title || 'A new announcement was created';
               const createdAtISO = new Date().toISOString();

               const rows = userIds && userIds!.map((uid) => ({
                    type: 'announcement',
                    title: baseTitle,
                    description: baseDescription,
                    created_at: createdAtISO,
                    user_id: uid, // <- per-user
                    is_read: false,
                    announcement_id: announcementId,
                    is_for_tenant: true,
               })) as unknown as BaseNotification[];

               // 3) Insert in batches (avoid payload limits)
               if (rows && rows.length > 0) {
                    const BATCH = 500;
                    for (let i = 0; i < rows.length; i += BATCH) {
                         const slice = rows.slice(i, i + BATCH);
                         const { error: nErr } = await supabase.from(NOTIFICATIONS_TABLE).insert(slice);

                         if (nErr) {
                              await logServerAction({
                                   user_id: null,
                                   action: 'createAnnouncementNotificationsBulk',
                                   duration_ms: 0,
                                   error: nErr.message,
                                   payload: { count: slice.length, announcementId },
                                   status: 'fail',
                                   type: 'db',
                              });
                              return { success: false, error: nErr.message };
                         }
                    }
               }
          } catch (e: any) {
               await logServerAction({
                    user_id: null,
                    action: 'createAnnouncementNotificationsBulkUnexpected',
                    duration_ms: 0,
                    error: e?.message || 'unexpected',
                    payload: { buildingIds: buildingIdsInput, announcementId: (data as any).id },
                    status: 'fail',
                    type: 'db',
               });
               return { success: false, error: e?.message || 'Unexpected error while creating notifications' };
          }
     }

     revalidatePath('/dashboard');
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
          if (notificationError) {
               logServerAction({
                    user_id: user_id ? user_id : null,
                    action: 'deleteAnnouncementNotification',
                    duration_ms: 0,
                    error: notificationError.message,
                    payload: { id },
                    status: 'fail',
                    type: 'db',
               });
          }
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
