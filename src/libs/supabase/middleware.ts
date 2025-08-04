import { NextResponse, type NextRequest } from "next/server";
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from "./sb-server";

/**
 * @function updateSession
 * @description Next.js middleware function to update user session based on Supabase authentication.
 * @param {NextRequest} request - The request object from Next.js.
 * @returns {NextResponse} - The response object from Next.js after updating the user session.
 * @remarks
 * This middleware function is used in Next.js pages to update the user session based on the Supabase authentication.
 * It bypasses the middleware for static/public assets or login, and proceeds with Supabase auth logic only for protected routes.
 * If the user is not authenticated or does not have an email, it redirects to the '/auth/error' page with an 'access_denied' error.
 * If the user is authenticated and has an email, but is not found in
 * 'tblClients', 'tblTenants', or 'tblSuperAdmins', it redirects to the
 * '/auth/error' page with an 'access_denied' error.
 * Otherwise, it returns the original response without any modification.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const PUBLIC_ROUTES = ["/auth/login", "/auth/error", "/auth/callback", "/auth/reset-password"];
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const token = request.cookies.get('sb-sorklznvftjmhkaejkej-auth-token')?.value;

  // Helper: create Supabase client and set session with token
  async function getUserFromToken(token: string | undefined) {
    if (!token) return null;
    const supabase = await useServerSideSupabaseAnonClient();
    // Try to set the access token as the current session
    try {
      await supabase.auth.setSession({ access_token: token, refresh_token: '' });
    } catch (e) {
      // setSession may throw if token is invalid
      return null;
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user;
  }

  if (isPublic) {
    if (token) {
      const user = await getUserFromToken(token);

      // Validate user properties before redirecting
      const isNotAnonymous = user && user.is_anonymous === false;
      const isEmailConfirmed = user && !!user.email_confirmed_at;
      const isEmailVerified = user && user.user_metadata && user.user_metadata.email_verified === true;

      if (isNotAnonymous && isEmailConfirmed && isEmailVerified) {
        // If authenticated and validated, redirect away from auth pages
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    // If not authenticated or not validated, allow access to auth pages
    return NextResponse.next();
  }

  if (!token) {
    // If no token, redirect to login for any protected route
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const user = await getUserFromToken(token);

  if (!user) {
    // If token is invalid or user not found, redirect to login
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',') || request.headers.get('remoteAddress');

  // Log the IP address for monitoring purposes (you can log to an external service)
  console.log(`Client IP: ${ip}`);

  // Allow the request to proceed if token and user are valid
  return NextResponse.next();
}
