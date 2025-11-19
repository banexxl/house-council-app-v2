import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";

const DEFAULT_BUCKET = process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1hconst SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h

/** Parse various image inputs into {bucket, path}. */
export const toStorageRef = (
     input: { storage_bucket?: string; storage_path?: string } | string
): { bucket: string; path: string } | null => {
     // Already normalized object
     if (typeof input === 'object' && input?.storage_path) {
          return { bucket: input.storage_bucket ?? DEFAULT_BUCKET, path: input.storage_path };
     }

     if (typeof input !== 'string') return null;

     // Full Supabase URL (public or signed) → extract bucket + path
     // Examples:
     //  .../storage/v1/object/public/<bucket>/<path>
     //  .../storage/v1/object/sign/<bucket>/<path>?token=...
     const m = input.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?]+)(?:\?|$)/);
     if (m) {
          const [, bucket, path] = m;
          return { bucket, path };
     }

     // Otherwise assume it's a plain path on the default bucket
     if (/^[\w\-]+\/.+/.test(input)) {
          return { bucket: DEFAULT_BUCKET, path: input };
     }

     return null;
}

export type DBStoredImage = {
     id: string;
     created_at: string;
     updated_at: string;
     storage_bucket: string;
     storage_path: string;
     is_cover_image: boolean;
     building_id: string;
};

export const signOne = async (supabase: any, bucket: string, path: string, ttlSeconds = 60 * 30) => {
     const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSeconds);
     if (error) return null;
     return data?.signedUrl ?? null;
}

/** Batch-sign many paths, grouped by bucket. Returns map bucket+path → signedUrl. */
export const signMany = async (
     supabase: Awaited<ReturnType<typeof useServerSideSupabaseAnonClient>>,
     refs: Array<{ bucket: string; path: string }>
) => {
     const byBucket = new Map<string, string[]>();
     refs.forEach(r => {
          const arr = byBucket.get(r.bucket) ?? [];
          arr.push(r.path);
          byBucket.set(r.bucket, arr);
     });

     const out = new Map<string, string>();
     for (const [bucket, paths] of byBucket) {
          if (!paths.length) continue;
          const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
          if (error) continue;
          data?.forEach((d, i) => {
               if (d?.signedUrl) out.set(`${bucket}::${paths[i]}`, d.signedUrl);
          });
     }
     return out;
}