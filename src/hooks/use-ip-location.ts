import { useEffect, useRef, useState } from 'react';

// In-memory cache for IP location lookups (module scoped)
const ipLocationCache: Record<string, string> = {};

/**
 * useIpLocation
 * Given an IP (or none), resolves the client IP (if needed) via `/api/ip` then fetches
 * geolocation via `/api/ip/get-location?ip=...`.
 * Caches location results in-memory per page lifecycle.
 * Returns an object: { ip, location, loading }
 * location values: "Loading..." | "Unknown" | "Country" | "City, Country"
 */
export const useIpLocation = (ip?: string | null): { ip: string | null; location: string; loading: boolean } => {
     const [resolvedIp, setResolvedIp] = useState<string | null>(ip ?? null);
     const [location, setLocation] = useState<string>(() => (ip && ipLocationCache[ip]) ? ipLocationCache[ip] : 'Loading...');
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
               setLocation(ipLocationCache[currentIp]);
               setLoadingLocation(false);
               return () => { isMounted.current = false; };
          }
          const controller = new AbortController();
          const fetchLocation = async () => {
               try {
                    setLoadingLocation(true);
                    const res = await fetch(`/api/ip/get-location?ip=${encodeURIComponent(currentIp)}`, { signal: controller.signal });
                    if (!res.ok) throw new Error('Failed');
                    const data = await res.json().catch(() => ({}));
                    let loc = 'Unknown';
                    if (data && data.city && data.country_name) {
                         loc = `${data.city}, ${data.country_name}`;
                    } else if (data && data.country_name) {
                         loc = data.country_name;
                    }
                    ipLocationCache[currentIp] = loc;
                    if (isMounted.current) setLocation(loc);
               } catch (e) {
                    if (!controller.signal.aborted) {
                         ipLocationCache[currentIp] = 'Unknown';
                         if (isMounted.current) setLocation('Unknown');
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
     return { ip: resolvedIp, location, loading: loadingIp || loadingLocation };
};
