'use server';

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Announcement } from 'src/types/announcement';
import { BaseNotification, NotificationTypeMap } from 'src/types/notification';
import { createAnnouncementNotification } from 'src/utils/notification';
import { signMany, toStorageRef } from 'src/utils/sb-bucket';
import { validate as isUUID } from 'uuid';
import { readAllTenantsFromBuildingIds } from '../tenant/tenant-actions';
import { sendNotificationEmail } from 'src/libs/email/node-mailer';
import { TABLES } from 'src/libs/supabase/tables';

type SupabaseServerClient = Awaited<ReturnType<typeof useServerSideSupabaseAnonClient>>;

type AnnouncementDocumentPayload = { url: string; name: string; mime?: string };

type AnnouncementImageRow = {
     announcement_id?: string | null;
     storage_bucket?: string | null;
     storage_path?: string | null;
};

type AnnouncementDocumentRow = AnnouncementImageRow & {
     file_name?: string | null;
     mime_type?: string | null;
};

const buildSignedMediaMaps = async (
     supabase: SupabaseServerClient,
     imageRows?: AnnouncementImageRow[] | null,
     documentRows?: AnnouncementDocumentRow[] | null,
) => {
     const imagesMap = new Map<string, string[]>();
     const documentsMap = new Map<string, AnnouncementDocumentPayload[]>();

     const imagePointers: Array<{ announcementId: string; key: string }> = [];
     const uniqueImageRefs: { bucket: string; path: string }[] = [];
     const seenImageKeys = new Set<string>();

     for (const row of imageRows ?? []) {
          const announcementId = row?.announcement_id;
          if (!announcementId) continue;
          const ref = toStorageRef({ storage_bucket: row?.storage_bucket ?? undefined, storage_path: row?.storage_path ?? undefined });
          if (!ref) continue;
          const key = `${ref.bucket}::${ref.path}`;
          imagePointers.push({ announcementId, key });
          if (!seenImageKeys.has(key)) {
               seenImageKeys.add(key);
               uniqueImageRefs.push(ref);
          }
     }

     const docPointers: Array<{ announcementId: string; key: string; name: string; mime?: string | null }> = [];
     const uniqueDocRefs: { bucket: string; path: string }[] = [];
     const seenDocKeys = new Set<string>();

     for (const row of documentRows ?? []) {
          const announcementId = row?.announcement_id;
          if (!announcementId) continue;
          const ref = toStorageRef({ storage_bucket: row?.storage_bucket ?? undefined, storage_path: row?.storage_path ?? undefined });
          if (!ref) continue;
          const key = `${ref.bucket}::${ref.path}`;
          docPointers.push({
               announcementId,
               key,
               name: row?.file_name ?? '',
               mime: row?.mime_type ?? undefined,
          });
          if (!seenDocKeys.has(key)) {
               seenDocKeys.add(key);
               uniqueDocRefs.push(ref);
          }
     }

     const signedImageMap = imagePointers.length > 0 ? await signMany(supabase, uniqueImageRefs) : new Map<string, string>();
     const signedDocMap = docPointers.length > 0 ? await signMany(supabase, uniqueDocRefs) : new Map<string, string>();

     imagePointers.forEach(pointer => {
          const url = signedImageMap.get(pointer.key);
          if (!url) return;
          const arr = imagesMap.get(pointer.announcementId) ?? [];
          arr.push(url);
          imagesMap.set(pointer.announcementId, arr);
     });

     docPointers.forEach(pointer => {
          const url = signedDocMap.get(pointer.key);
          if (!url) return;
          const arr = documentsMap.get(pointer.announcementId) ?? [];
          arr.push({ url, name: pointer.name, mime: pointer.mime ?? undefined });
          documentsMap.set(pointer.announcementId, arr);
     });

     return { imagesMap, documentsMap };
};

// ============================= READ OPERATIONS =============================
export async function getAnnouncements(): Promise<{ success: boolean; error?: string; data?: Announcement[] }> {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase
          .from(TABLES.ANNOUNCEMENTS)
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
                         .from(TABLES.ANNOUNCEMENT_IMAGES)
                         .select('announcement_id, storage_bucket, storage_path')
                         .in('announcement_id', ids),
                    supabase
                         .from(TABLES.ANNOUNCEMENT_DOCUMENTS)
                         .select('announcement_id, storage_bucket, storage_path, file_name, mime_type')
                         .in('announcement_id', ids),
               ]);

               const { imagesMap, documentsMap } = await buildSignedMediaMaps(
                    supabase,
                    imgRows as AnnouncementImageRow[],
                    docRows as AnnouncementDocumentRow[],
               );


               const bMap = new Map<string, string[]>();
               // Buildings enrichment (many-to-many pivot) — unchanged
               try {
                    const { data: buildingRows, error: bErr } = await supabase
                         .from(TABLES.BUILDINGS_ANNOUNCEMENTS)
                         .select('announcement_id,building_id')
                         .in('announcement_id', ids);
                    if (!bErr && buildingRows) {
                         for (const row of buildingRows as any[]) {
                              const annId = row.announcement_id as string;
                              const bId = row.building_id as string;
                              if (!bMap.has(annId)) bMap.set(annId, []);
                              bMap.get(annId)!.push(bId);
                         }
                    }
               } catch { /* ignore buildings enrichment errors */ }

               enriched = enriched.map(a => {
                    const annId = a.id ?? '';
                    const buildings = annId ? bMap.get(annId) || [] : [];
                    const images = annId ? imagesMap.get(annId) || [] : [];
                    const documents = annId ? documentsMap.get(annId) || [] : [];
                    return { ...a, buildings, images, documents };
               });
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
     const { data, error } = await supabase.from(TABLES.ANNOUNCEMENTS).select('*').eq('id', id).single();

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
                    .from(TABLES.ANNOUNCEMENT_IMAGES)
                    .select('storage_bucket, storage_path')
                    .eq('announcement_id', id),
               supabase
                    .from(TABLES.ANNOUNCEMENT_DOCUMENTS)
                    .select('storage_bucket, storage_path, file_name, mime_type')
                    .eq('announcement_id', id),
          ]);

          const normalizedImageRows = (imgRows ?? []).map(row => ({ ...(row as any), announcement_id: id }));
          const normalizedDocumentRows = (docRows ?? []).map(row => ({ ...(row as any), announcement_id: id }));
          const { imagesMap, documentsMap } = await buildSignedMediaMaps(
               supabase,
               normalizedImageRows as AnnouncementImageRow[],
               normalizedDocumentRows as AnnouncementDocumentRow[],
          );
          images = imagesMap.get(id) ?? [];
          documents = documentsMap.get(id) ?? [];

          // Buildings (unchanged)
          try {
               const { data: buildingRows } = await supabase
                    .from(TABLES.BUILDINGS_ANNOUNCEMENTS)
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
               .from(TABLES.BUILDINGS_ANNOUNCEMENTS)
               .select('announcement_id, building_id')
               .in('building_id', buildingIds);
          if (pivotErr) return { success: false, error: pivotErr.message };

          const annIds = Array.from(new Set((pivotRows || []).map(r => (r as any).announcement_id))).filter(Boolean);
          if (annIds.length === 0) return { success: true, data: [], buildings: {} };

          // 2) Fetch announcements in bulk (filter published)
          const { data: annRows, error: annErr } = await supabase
               .from(TABLES.ANNOUNCEMENTS)
               .select('*')
               .in('id', annIds)
               .eq('status', 'published')
               .eq('archived', false)
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
                         .from(TABLES.ANNOUNCEMENT_IMAGES)
                         .select('announcement_id, storage_bucket, storage_path')
                         .in('announcement_id', annIds),
                    supabase
                         .from(TABLES.ANNOUNCEMENT_DOCUMENTS)
                         .select('announcement_id, storage_bucket, storage_path, file_name, mime_type')
                         .in('announcement_id', annIds),
               ]);

               const { imagesMap, documentsMap } = await buildSignedMediaMaps(
                    supabase,
                    imgRows as AnnouncementImageRow[],
                    docRows as AnnouncementDocumentRow[],
               );

               enriched = enriched.map(a => {
                    const annId = a.id ?? '';
                    return {
                         ...a,
                         buildings: annToBuildings.get(annId) || [],
                         images: annId ? imagesMap.get(annId) || [] : [],
                         documents: annId ? documentsMap.get(annId) || [] : [],
                    };
               });
          } catch { /* ignore enrichment errors */ }

          // 5) Fetch building records (for label display)
          let buildingsMap: Record<string, any> = {};
          try {
               const uniqueBIds = Array.from(new Set(buildingIds));
               if (uniqueBIds.length > 0) {
                    const { data: bRows } = await supabase
                         .from(TABLES.BUILDINGS)
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

export const getAllAutoPublishReadyAnnouncements = async (): Promise<Announcement[]> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const now = Date.now();
     // Fetch draft announcements that have scheduling fields set
     const { data, error } = await supabase
          .from(TABLES.ANNOUNCEMENTS)
          .select('*')
          .eq('status', 'draft')
          .not('scheduled_at', 'is', null)
          .not('scheduled_timezone', 'is', null)
          .eq('schedule_enabled', true);

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'getAllAutoPublishReadyAnnouncements',
               duration_ms: Date.now() - now,
               error: error.message,
               payload: {},
               status: 'fail',
               type: 'db',
          });
          return [];
     }

     return (data || []) as Announcement[];
};

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
          // Preserve publish status on updates (managed via publish/unpublish actions)
          delete record.status;
          delete record.published_at;
          record.updated_at = now;
     } else {
          record.created_at = now;
          record.updated_at = now;
          record.published_at = record.status === 'draft' ? null : now;
     }

     const { data, error } = await supabase
          .from(TABLES.ANNOUNCEMENTS)
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
                    .from(TABLES.BUILDINGS_ANNOUNCEMENTS)
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
                    const { error: pivotErr } = await supabase.from(TABLES.BUILDINGS_ANNOUNCEMENTS).insert(pivotRows);

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

     // Notifications are emitted on publish only (see publishAnnouncement)

     // Ensure a sensible status in the returned payload if DB stores null
     const ret: any = data as any;
     if (ret && (ret.status == null)) ret.status = ret.published_at ? 'published' : 'draft';

     revalidatePath('/dashboard');
     return { success: true, data: ret as Announcement };
}

// ============================= DELETE/ARCHIVE =============================
export async function deleteAnnouncement(id: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { error } = await supabase.from(TABLES.ANNOUNCEMENTS).delete().eq('id', id);
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
          const notification = createAnnouncementNotification({
               announcement_id: id,
               title: 'Announcement deleted',
               description: `Announcement ${id} was deleted`,
               created_at: new Date().toISOString(),
               user_id: user_id ? user_id : null,
               is_read: false,
               is_for_tenant: false,
          });

     } catch { /* best effort */ }
     revalidatePath('/dashboard/announcements');
     return { success: true, data: null };
}

export async function archiveAnnouncement(id: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null).catch(() => null);
     const { error } = await supabase.from(TABLES.ANNOUNCEMENTS).update({ archived: true, updated_at: new Date() }).eq('id', id);
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
     const { error } = await supabase.from(TABLES.ANNOUNCEMENTS).update({ pinned, updated_at: new Date() }).eq('id', id);
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
export async function publishAnnouncement(id: string, typeInfo?: NotificationTypeMap) {

     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const user = await supabase.auth.getUser()
     const now = new Date();
     const { error } = await supabase.from(TABLES.ANNOUNCEMENTS).update({ status: 'published', published_at: now, updated_at: now }).eq('id', id);
     if (error) {
          await logServerAction({
               user_id: user ? user.data.user?.id! : null,
               action: 'publishAnnouncement',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }

     // Create notifications for tenants of targeted buildings on publish (realtime INSERT consumers pick this up)
     try {
          // 1) Resolve targeted buildings from pivot
          const { data: bRows, error: bErr } = await supabase
               .from(TABLES.BUILDINGS_ANNOUNCEMENTS)
               .select('building_id')
               .eq('announcement_id', id);

          if (!bErr && bRows && bRows.length > 0) {
               const buildingIds = Array.from(new Set((bRows as any[]).map(r => r.building_id).filter(Boolean)));
               if (buildingIds.length > 0) {
                    // 2) Get all tenant user ids for those buildings
                    const { data: tenants } = await readAllTenantsFromBuildingIds(buildingIds);
                    // 3) Fetch announcement for title/message
                    const { data: annRow } = await supabase.from(TABLES.ANNOUNCEMENTS).select('title, message').eq('id', id).maybeSingle();
                    const createdAtISO = new Date().toISOString();
                    const rows = (tenants || []).map((tenant) => (
                         createAnnouncementNotification({
                              title: annRow?.title || '',
                              description: annRow?.message || '',
                              created_at: createdAtISO,
                              user_id: tenant.user_id!,
                              is_read: false,
                              announcement_id: id,
                              is_for_tenant: true,
                         })
                    )) as unknown as BaseNotification[];
               }
          }
     } catch (e: any) {
          await logServerAction({ user_id: null, action: 'publishAnnouncementNotificationsUnexpected', duration_ms: 0, error: e?.message || 'unexpected', payload: { id }, status: 'fail', type: 'db' });
     }
     await logServerAction({
          user_id: user ? user.data.user?.id! : null,
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
     const { error } = await supabase.from(TABLES.ANNOUNCEMENTS).update({ status: 'draft', published_at: null, updated_at: new Date() }).eq('id', id);
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
     const { error } = await supabase.from(TABLES.ANNOUNCEMENTS).update({ archived, updated_at: new Date() }).eq('id', id);
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
