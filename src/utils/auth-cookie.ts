// utils/auth-cookie.ts (Edge-safe)
const TOKEN_BASE = process.env.SUPABASE_AUTH_COOKIE_BASE!

// Base64url → base64, then decode using atob (Edge-safe)
function b64urlToString(b64url: string) {
     const base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
     const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
     const bin = atob(padded);
     // convert binary string to utf-8
     const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
     return new TextDecoder().decode(bytes);
}

export function getCookieRaw(req: import('next/server').NextRequest): string | null {
     // 1) single cookie
     const single = req.cookies.get(TOKEN_BASE)?.value;
     if (single) return single;

     // 2) split cookies: .0, .1, ...
     const parts: string[] = [];
     for (let i = 0; ; i++) {
          const part = req.cookies.get(`${TOKEN_BASE}.${i}`)?.value;
          if (!part) break;
          parts.push(part);
     }
     return parts.length ? parts.join('') : null;
}

export function extractAccessToken(raw: string | null): string | null {
     if (!raw) return null;
     if (raw.startsWith('base64-')) {
          // Supabase session blob → decode and read access_token
          try {
               const json = b64urlToString(raw.slice(7));
               const obj = JSON.parse(json);
               return obj?.access_token || null;
          } catch {
               return null;
          }
     }
     // Sometimes Supabase stores the JWT directly
     // (no "base64-" prefix) — in that case it's already the access token.
     return raw.includes('.') ? raw : null;
}
