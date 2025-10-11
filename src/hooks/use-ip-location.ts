import { useEffect, useRef, useState } from 'react';
import type { IpLocationResponse } from 'src/types/ip-location';
import { formatIpLocation } from 'src/types/ip-location';

// In-memory cache for IP location lookups (module scoped)
interface CachedEntry { formatted: string; raw: IpLocationResponse | null }
const ipLocationCache: Record<string, CachedEntry> = {};

/**
 * useIpLocation
 * Given an IP (or none), resolves the client IP (if needed) via `/api/ip` then fetches
 * geolocation via `/api/ip/get-location?ip=...`.
 * Caches location results in-memory per page lifecycle.
 * Returns an object: { ip, location, loading }
 * location values: "Loading..." | "Unknown" | "Country" | "City, Country"
 */
export const useIpLocation = (ip?: string | null): { ip: string | null; location: string; loading: boolean; data: IpLocationResponse | null } => {
     const [resolvedIp, setResolvedIp] = useState<string | null>(ip ?? null);
     const [location, setLocation] = useState<string>(() => (ip && ipLocationCache[ip]) ? ipLocationCache[ip].formatted : 'Loading...');
     const [data, setData] = useState<IpLocationResponse | null>(() => (ip && ipLocationCache[ip]) ? ipLocationCache[ip].raw : null);
     const [loadingIp, setLoadingIp] = useState(!ip);
     const [loadingLocation, setLoadingLocation] = useState(true);
     const isMounted = useRef(true);

     // Step 1: If no IP passed in, fetch it from /api/ip
     useEffect(() => {
          if (ip) {
               setResolvedIp(ip);
               setLoadingIp(false);
               return; // caller provided ip
          }
          let cancelled = false;
          setLoadingIp(true);
          fetch('/api/ip')
               .then(r => r.json())
               .then(data => {
                    if (cancelled) return;
                    setResolvedIp(data?.ip || null);
                    setLoadingIp(false);
               })
               .catch(() => { if (!cancelled) { setResolvedIp(null); setLoadingIp(false); } });
          return () => { cancelled = true; };
     }, [ip]);

     // Step 2: When we have an IP, fetch location (with caching)
     useEffect(() => {
          isMounted.current = true;
          const currentIp = resolvedIp || '';
          if (!currentIp) {
               setLocation('Unknown');
               setLoadingLocation(false);
               return () => { isMounted.current = false; };
          }
          if (ipLocationCache[currentIp]) {
               setLocation(ipLocationCache[currentIp].formatted);
               setData(ipLocationCache[currentIp].raw);
               setLoadingLocation(false);
               return () => { isMounted.current = false; };
          }
          const controller = new AbortController();
          const fetchLocation = async () => {
               try {
                    setLoadingLocation(true);
                    const res = await fetch(`/api/ip/get-location?ip=${encodeURIComponent(currentIp)}`, { signal: controller.signal });
                    if (!res.ok) throw new Error('Failed');
                    const json: IpLocationResponse = await res.json().catch(() => ({} as IpLocationResponse));
                    const formatted = formatIpLocation(json);
                    ipLocationCache[currentIp] = { formatted, raw: json };
                    if (isMounted.current) {
                         setLocation(formatted);
                         setData(json);
                    }
               } catch (e) {
                    if (!controller.signal.aborted) {
                         ipLocationCache[currentIp] = { formatted: 'Unknown', raw: null };
                         if (isMounted.current) {
                              setLocation('Unknown');
                              setData(null);
                         }
                    }
               } finally {
                    if (isMounted.current) setLoadingLocation(false);
               }
          };
          fetchLocation();
          return () => {
               isMounted.current = false;
               controller.abort();
          };
     }, [resolvedIp]);
     return { ip: resolvedIp, location, loading: loadingIp || loadingLocation, data };
};
