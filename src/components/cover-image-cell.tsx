// src/components/CoverImageCell.tsx
'use client';

import { useSignedUrl } from "src/hooks/use-signed-urls";

export function CoverImageCell({
     bucket,
     path,
     width = 64,
     height = 40,
}: {
     bucket: string;
     path?: string | null;
     width?: number;
     height?: number;
}) {
     const { url, loading } = useSignedUrl(bucket, path, { ttlSeconds: 60 * 30, refreshSkewSeconds: 20 });
     if (!path) return null;
     if (!url) {
          // Avoid passing empty string to img src; render a lightweight placeholder
          return (
               <span style={{ display: 'inline-block', width, height, borderRadius: 6, background: '#f4f4f5' }} />
          );
     }
     return (
          <img
               src={url}
               alt="cover"
               width={width}
               height={height}
               style={{ objectFit: 'cover', borderRadius: 6, background: '#f4f4f5' }}
          />
     );
}
