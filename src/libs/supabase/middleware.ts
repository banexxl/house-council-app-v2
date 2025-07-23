import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * @function updateSession
 * @description Next.js middleware function to update user session based on Supabase authentication.
 * @param {NextRequest} request - The request object from Next.js.
 * @returns {NextResponse} - The response object from Next.js after updating the user session.
 * @remarks
 * This middleware function is used in Next.js pages to update the user session based on the Supabase authentication.
 * It bypasses the middleware for static/public assets or login, and proceeds with Supabase auth logic only for protected routes.
 * If the user is not authenticated or does not have an email, it redirects to the '/auth/error' page with an 'access_denied' error.
 * If the user is authenticated and has an email, but is not found in the 'tblClients' table, it redirects to the '/auth/error' page with an 'access_denied' error.
 * Otherwise, it returns the original response without any modification.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const PUBLIC_ROUTES = ["/auth/login", "/auth/error", "/auth/callback"];
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (isPublic) {
    return NextResponse.next();
  }

  // ✅ FIX: create response before passing into Supabase client
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(new URL("/auth/error?error=access_denied", request.url));
  }

  const { data: client } = await supabase
    .from("tblClients")
    .select("id, role")
    .eq("email", user.email)
    .maybeSingle();

  const { data: tenant } = await supabase
    .from("tblTenants")
    .select("id, role")
    .eq("email", user.email)
    .maybeSingle();

  const { data: admin } = await supabase
    .from("tblSuperAdmins")
    .select("id, role")
    .eq("email", user.email)
    .maybeSingle();

  if (!client && !tenant && !admin) {
    return NextResponse.redirect(new URL("/auth/error?error_code=access_denied", request.url));
  }

  const role =
    (user.user_metadata as any)?.role ||
    (user.app_metadata as any)?.role ||
    admin?.role ||
    tenant?.role ||
    client?.role;
  console.log('role', role);

  // Role based navigation
  if (role === "admin") {
    return response;
  }

  if (role === "client") {
    const superAdminRoutes = ["/dashboard/clients", "/dashboard/subscriptions"];
    const isRestricted = superAdminRoutes.some((route) =>
      pathname.startsWith(route),
    );
    if (isRestricted) {
      return NextResponse.redirect(
        new URL("/auth/error?error_code=access_denied", request.url),
      );
    }
    return response;
  }

  if (role === "tenant") {
    const allowedTenantPaths = ["/dashboard/tenants"];
    const allowed = allowedTenantPaths.some((route) => pathname.startsWith(route));
    if (!allowed) {
      return NextResponse.redirect(new URL("/auth/error?error_code=access_denied", request.url));
    }
    return response;
  }

  return NextResponse.redirect(new URL("/auth/error?error_code=access_denied", request.url));
}
