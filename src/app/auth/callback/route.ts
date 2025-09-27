import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { useServerSideSupabaseServiceRoleClient } from "src/libs/supabase/sb-server";

export async function GET(request: Request) {

  const cookieStore = await cookies();
  const supabase = await useServerSideSupabaseServiceRoleClient();

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error");
  const errorCode = requestUrl.searchParams.get("error_code");

  if (oauthError) {
    const errorPageUrl = `${requestUrl.origin}/auth/error?error=${oauthError}&error_code=${errorCode})}`;
    return NextResponse.redirect(errorPageUrl);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=${error.message}`);
    }
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    const message = sessionError ? sessionError.message : "No session found.";
    return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=${message}`);
  }

  const userEmail = sessionData.session.user.email;

  const { data: client, error: clientError } = await supabase
    .from("tblClients")
    .select("id")
    .eq("email", userEmail)
    .single();

  if (clientError && clientError.code !== "PGRST116") {
    await supabase.auth.signOut();
    await supabase.auth.admin.deleteUser(sessionData.session.user.id);
    cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
    return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=${clientError.message}`);
  }

  let role: "client" | "tenant" | "admin" | null = null;
  let userId: string | undefined;

  if (client) {
    role = "client";
    userId = client.id;
  } else {
    const { data: tenant, error: tenantError } = await supabase
      .from("tblTenants")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    if (tenantError && tenantError.code !== "PGRST116") {
      await supabase.auth.signOut();
      cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
      return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=${tenantError.message}`);
    }

    if (tenant) {
      role = "tenant";
      userId = tenant.id;
    } else {
      const { data: admin, error: adminError } = await supabase
        .from("tblSuperAdmins")
        .select("id")
        .eq("email", userEmail)
        .single();

      if (adminError && adminError.code !== "PGRST116") {
        await supabase.auth.signOut();
        cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
        return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=${adminError.message}`);
      }

      if (admin) {
        role = "admin";
        userId = admin.id;
      } else {
        await supabase.auth.signOut();
        cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/error?error_code=email_not_registered`,
        );
      }
    }
  }

  if (role === "client") {
    const { data: subscription, error: subscriptionError } = await supabase
      .from("tblClient_Subscription")
      .select("*")
      .eq("client_id", userId!)
      .eq("status", "active")
      .maybeSingle();

    if (subscriptionError || !subscription) {
      await supabase.auth.signOut();
      cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
      return NextResponse.redirect(`${requestUrl.origin}/auth/error?error_code=no_subscription`);
    }
  }

  const dashboardUrl = `${requestUrl.origin}/dashboard`;
  return NextResponse.redirect(dashboardUrl);
}
