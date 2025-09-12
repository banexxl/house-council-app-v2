const DEFAULT_BUCKET = process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;

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