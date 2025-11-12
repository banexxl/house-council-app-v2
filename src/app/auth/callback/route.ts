import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { TABLES } from "src/libs/supabase/tables";
import { useServerSideSupabaseServiceRoleClient } from "src/libs/supabase/sb-server";
import { getClientIdFromTenantBuilding } from "src/app/actions/tenant/tenant-actions";
import { checkClientSubscriptionStatus } from "src/app/actions/subscription-plan/subscription-plan-actions";

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
    .from(TABLES.CLIENTS)
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
      .from(TABLES.TENANTS)
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
        .from(TABLES.SUPER_ADMINS)
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
      .from(TABLES.CLIENT_SUBSCRIPTION)
      .select("*")
      .eq("client_id", userId!)
      .in("status", ["active", "trialing"])
      .single();


    if (subscriptionError || !subscription) {
      await supabase.auth.signOut();
      cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
      return NextResponse.redirect(`${requestUrl.origin}/auth/error?error_code=no_subscription`);
    }
  }

  if (role === "tenant") {
    try {
      // Get client ID from tenant's building
      const { data: client_id, success: clientIdSuccess, error: clientIdError } = await getClientIdFromTenantBuilding(userId!);

      if (!clientIdSuccess || !client_id) {
        await supabase.auth.signOut();
        cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
        return NextResponse.redirect(`${requestUrl.origin}/auth/error?error_code=building_association_failed&error=${encodeURIComponent(clientIdError || 'Failed to get client ID')}`);
      }

      // Check client subscription status
      const { success: subscriptionSuccess, isActive, error: subscriptionError } = await checkClientSubscriptionStatus(client_id);

      if (!subscriptionSuccess) {
        await supabase.auth.signOut();
        cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
        return NextResponse.redirect(`${requestUrl.origin}/auth/error?error_code=subscription_check_failed&error=${encodeURIComponent(subscriptionError || 'Subscription check failed')}`);
      }

      if (!isActive) {
        await supabase.auth.signOut();
        cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
        return NextResponse.redirect(`${requestUrl.origin}/auth/error?error_code=no_building_subscription`);
      }

    } catch (error: any) {
      await supabase.auth.signOut();
      cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
      return NextResponse.redirect(`${requestUrl.origin}/auth/error?error_code=validation_error&error=${encodeURIComponent(error.message || 'Unexpected error')}`);
    }
  }

  const dashboardUrl = `${requestUrl.origin}/dashboard`;
  return NextResponse.redirect(dashboardUrl);
}
