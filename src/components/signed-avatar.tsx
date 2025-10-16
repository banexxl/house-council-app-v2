import { useEffect, useState } from 'react';
import Avatar, { AvatarProps } from '@mui/material/Avatar';
import SvgIcon from '@mui/material/SvgIcon';
import User01Icon from '@untitled-ui/icons-react/build/esm/User01';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import log from 'src/utils/logger';

/**
 * SignedAvatar
 *
 * Accepts either a full public URL or a storage path (e.g. `avatars/user123.png`).
 * If a storage path is provided (heuristic: no `http`/`https` prefix), it will
 * request a signed URL from Supabase Storage (default expiry 60 minutes).
 */
export interface SignedAvatarProps extends Omit<AvatarProps, 'src'> {
     /** Raw avatar value stored in DB. Can be empty string. */
     value?: string | null;
     /** Optional bucket override if the value is just a filename. */
     bucket?: string;
     /** Signed URL expiration in seconds (default 3600). */
     expiresIn?: number;
     /**
      * If true (default), will attempt to re-create a fresh signed URL when the provided
      * value itself is an existing Supabase signed URL (contains /object/sign/). This helps
      * when callers accidentally persist a signed URL instead of the underlying path.
      */
     resignIfSignedUrl?: boolean;
     /**
      * If true (default) and bucket prop not supplied OR differs, auto-detect bucket from
      * the first path segment of value (e.g. `avatars/user123.png`).
      */
     autoDetectBucket?: boolean;
}

export const SignedAvatar = ({
     value,
     bucket = 'avatars',
     expiresIn = 3600,
     resignIfSignedUrl = true,
     autoDetectBucket = true,
     children,
     ...avatarProps
}: SignedAvatarProps) => {
     const [src, setSrc] = useState<string | undefined>();
     const [loading, setLoading] = useState(false);
     useEffect(() => {
          let active = true;
          log(`SignedAvatar: start value=${value} bucketProp=${bucket}`);
          const resolve = async () => {
               if (!value) {
                    log('SignedAvatar: empty value -> clearing src');
                    setSrc(undefined);
                    return;
               }
               let rawValue = value as string;
               const isUrl = /^https?:\/\//i.test(rawValue);
               log(`SignedAvatar: isUrl=${isUrl}`);
               const isSupabaseSigned = isUrl && /\/storage\/v1\/object\/sign\//.test(rawValue);
               log(`SignedAvatar: isSupabaseSigned=${isSupabaseSigned}`);
               if (isUrl && (!isSupabaseSigned || !resignIfSignedUrl)) {
                    log('SignedAvatar: using direct URL without signing');
                    setSrc(rawValue);
                    return;
               }
               if (isUrl && isSupabaseSigned && resignIfSignedUrl) {
                    try {
                         const match = rawValue.match(/\/storage\/v1\/object\/sign\/([^?]+)/);
                         if (match) {
                              rawValue = decodeURIComponent(match[1]);
                              log(`SignedAvatar: extracted raw storage path from signed URL => ${rawValue}`);
                         } else {
                              log('SignedAvatar: could not extract path from signed URL; fallback direct');
                              setSrc(value);
                              return;
                         }
                    } catch (e) {
                         console.warn('[SignedAvatar] parse signed URL failed', e);
                         setSrc(value);
                         return;
                    }
               }
               // rawValue now either bucket/path or path
               let path = rawValue;
               let effectiveBucket = bucket;
               const firstSlash = rawValue.indexOf('/');
               log(`SignedAvatar: firstSlash=${firstSlash}`);
               if (firstSlash > -1) {
                    const possibleBucket = rawValue.substring(0, firstSlash);
                    log(`SignedAvatar: possibleBucket=${possibleBucket}`);
                    if (possibleBucket === bucket) {
                         path = rawValue.substring(firstSlash + 1);
                         log(`SignedAvatar: bucketProp matches first segment, path=${path}`);
                    } else if ((!bucket || autoDetectBucket) && possibleBucket.length > 0) {
                         effectiveBucket = possibleBucket;
                         path = rawValue.substring(firstSlash + 1);
                         log(`SignedAvatar: auto-detected bucket=${effectiveBucket} path=${path}`);
                    }
               }
               setLoading(true);
               log(`SignedAvatar: signing request bucket=${effectiveBucket} path=${path} expiresIn=${expiresIn}`);
               try {
                    const { data, error } = await supabaseBrowserClient
                         .storage
                         .from(effectiveBucket)
                         .createSignedUrl(path, expiresIn);
                    if (!active) return;
                    if (error) {
                         log(`SignedAvatar: sign error code=${(error as any).statusCode || 'n/a'} message=${error.message}`);
                         console.warn('[SignedAvatar] failed to sign url', { error, value, effectiveBucket, path });
                         setSrc(undefined);
                    } else {
                         log(`SignedAvatar: signed URL success length=${data?.signedUrl?.length}`);
                         setSrc(data?.signedUrl);
                    }
               } catch (err: any) {
                    if (active) {
                         log(`SignedAvatar: unexpected signing exception name=${err?.name} message=${err?.message}`);
                         console.error('[SignedAvatar] unexpected error signing URL', err);
                         setSrc(undefined);
                    }
               } finally {
                    if (active) {
                         setLoading(false);
                         log('SignedAvatar: loading=false');
                    }
               }
          };
          resolve();
          return () => { active = false; };
     }, [value, bucket, expiresIn, resignIfSignedUrl, autoDetectBucket]);

     return (
          <Avatar src={src} {...avatarProps}>
               {children || (
                    <SvgIcon>
                         <User01Icon />
                    </SvgIcon>
               )}
          </Avatar>
     );
};
