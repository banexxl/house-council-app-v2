'use client';

import { useEffect, useRef, useState } from 'react';

type Options = {
     ttlSeconds?: number;
     refreshSkewSeconds?: number; // refresh this many seconds before exp
};

function getExpFromToken(url: string): number | null {
     try {
          const u = new URL(url);
          const token = u.searchParams.get('token');
          if (!token) return null;
          const [, payload] = token.split('.');
          if (!payload) return null;
          const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
          return typeof json?.exp === 'number' ? json.exp : null;
     } catch {
          return null;
     }
}

export function useSignedUrl(bucket: string, path?: string | null, opts?: Options) {
     const ttlSeconds = opts?.ttlSeconds ?? 60 * 30; // 30 min
     const skew = Math.max(5, Math.min(opts?.refreshSkewSeconds ?? 20, Math.floor(ttlSeconds / 2)));

     const [url, setUrl] = useState<string | null>(null);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);
     const timerRef = useRef<number | null>(null);

     async function fetchSigned() {
          if (!path || !bucket) return;
          setLoading(true);
          setError(null);
          try {
               const resp = await fetch('/api/storage/sign-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bucket, path, ttlSeconds }),
               });
               if (!resp.ok) throw new Error(`sign failed: ${resp.status}`);
               const data = await resp.json();
               setUrl(data.signedUrl);
               scheduleRefresh(data.signedUrl);
          } catch (e: any) {
               setError(e?.message ?? 'Unknown error');
          } finally {
               setLoading(false);
          }
     }

     function scheduleRefresh(signedUrl: string) {
          const exp = getExpFromToken(signedUrl);
          if (!exp) return;
          const now = Date.now();
          const due = Math.max(1000, exp * 1000 - now - skew * 1000);
          if (timerRef.current) window.clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => {
               fetchSigned().catch(() => { });
     }, due);
     }

     useEffect(() => {
          if (timerRef.current) {
               window.clearTimeout(timerRef.current);
               timerRef.current = null;
          }
          if (!path || !bucket) {
               setUrl(null);
               setError(null);
               setLoading(false);
               return;
          }
          fetchSigned();
          return () => {
               if (timerRef.current) window.clearTimeout(timerRef.current);
          };
          // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [bucket, path]);

     // revalidate on focus if near expiry
     useEffect(() => {
          function maybeRefresh() {
               if (!url) return;
               const exp = getExpFromToken(url);
               if (!exp) return;
               const msLeft = exp * 1000 - Date.now();
               if (msLeft < skew * 1000) fetchSigned();
          }
          window.addEventListener('focus', maybeRefresh);
          document.addEventListener('visibilitychange', () => {
               if (document.visibilityState === 'visible') maybeRefresh();
          });
          return () => {
               window.removeEventListener('focus', maybeRefresh);
               document.removeEventListener('visibilitychange', maybeRefresh);
          };
          // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [url, skew]);

     return { url, loading, error, refreshNow: fetchSigned };
}
