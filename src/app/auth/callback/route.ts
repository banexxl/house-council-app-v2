import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { TABLES } from "src/libs/supabase/tables";
import { useServerSideSupabaseServiceRoleClient } from "src/libs/supabase/sb-server";
import { getClientIdFromTenantBuilding } from "src/app/actions/tenant/tenant-actions";
import { checkClientSubscriptionStatus } from "src/app/actions/subscription-plan/subscription-plan-actions";
import log from "src/utils/logger";

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
  type Role = "client" | "clientMember" | "tenant" | "admin";
  let role: Role | null = null;
  let userId: string | undefined;

  const cleanAndRedirect = async (errorParam: string) => {
    await supabase.auth.signOut();
    await supabase.auth.admin.deleteUser(sessionData.session.user.id);
    cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
    return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=${errorParam}`);
  };

  const fetchByEmail = async (table: string, select = "id") => {
    return supabase.from(table).select(select).eq("email", userEmail).maybeSingle();
  };

  //Admin
  const { data: superAdmin, error: superAdminError } = await fetchByEmail(TABLES.SUPER_ADMINS, "id, user_id");
  if (superAdminError && superAdminError.code !== "PGRST116") {
    log(`Error fetching super admin by email: ${superAdminError.message}`, 'error');
    return cleanAndRedirect(superAdminError.message);
  }
  if (superAdmin && typeof superAdmin === "object" && "id" in superAdmin) {
    role = "admin";
    userId = (superAdmin as { id: string }).id;
  }

  // Client
  const { data: clientData, error: clientError } = await fetchByEmail(TABLES.CLIENTS, "id, user_id");
  if (clientError && clientError.code !== "PGRST116") {
    log(`Error fetching client by email: ${clientError.message}`, 'error');
    return cleanAndRedirect(clientError.message);
  }
  if (clientData && typeof clientData === "object" && "user_id" in clientData) {
    role = "client";
    userId = (clientData as { user_id: string }).user_id;
  }

  // Tenant
  if (!role) {
    const { data: tenantData, error: tenantError } = await fetchByEmail(TABLES.TENANTS, "id, user_id");
    if (tenantError && tenantError.code !== "PGRST116") {
      log(`Error fetching tenant by email: ${tenantError.message}`, 'error');
      return cleanAndRedirect(tenantError.message);
    }
    if (tenantData && typeof tenantData === "object" && "user_id" in tenantData) {
      role = "tenant";
      userId = (tenantData as { user_id: string }).user_id;
    }
  }

  // Client member
  if (!role) {
    const { data: clientMemberRow, error: clientMemberError } = await fetchByEmail(TABLES.CLIENT_MEMBERS, "id, user_id");
    if (clientMemberError && clientMemberError.code !== "PGRST116") {
      log(`Error fetching client member by email: ${clientMemberError.message}`, 'error');
      return cleanAndRedirect(clientMemberError.message);
    }
    if (clientMemberRow && typeof clientMemberRow === "object" && "user_id" in clientMemberRow) {
      role = "clientMember";
      userId = (clientMemberRow as { user_id: string }).user_id;
    }
  }

  // No matching role -> delete auth user
  if (!role) {
    await supabase.auth.signOut();
    await supabase.auth.admin.deleteUser(sessionData.session.user.id);
    cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?error_code=email_not_registered`,
    );
  }

  if (role === "client") {
    const clientId = (clientData && typeof clientData === "object" && "id" in clientData) ? (clientData as { id: string }).id : undefined;
    if (!clientId) {
      log(`Client data missing 'id' property`, 'error');
      await supabase.auth.signOut();
      cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
      return NextResponse.redirect(`${requestUrl.origin}/auth/error?error_code=client_id_missing`);
    }
    const { data: subscription, error: subscriptionError } = await supabase
      .from(TABLES.CLIENT_SUBSCRIPTION)
      .select("*")
      .eq("client_id", clientId)
      .in("status", ["active", "trialing"])
      .single();

    if (subscriptionError || !subscription) {
      log(`No active subscription found for client ID ${clientId}`, 'info');
      await supabase.auth.signOut();
      cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
      return NextResponse.redirect(`${requestUrl.origin}/auth/error?error_code=no_subscription`);
    }
  }

  if (role === "clientMember") {
    const { data: subscription, error: subscriptionError } = await supabase
      .from(TABLES.CLIENT_SUBSCRIPTION)
      .select("*")
      .eq("client_id", clientData && typeof clientData === "object" && "id" in clientData ? (clientData as { id: string }).id : '')
      .in("status", ["active", "trialing"])
      .single();

    if (subscriptionError || !subscription) {
      log(`No active subscription found for client member ID ${clientData && typeof clientData === "object" && "id" in clientData ? (clientData as { id: string }).id : ''}`, 'info');
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
        log(`Failed to get client ID from tenant's building: ${clientIdError}`, 'error');
        await supabase.auth.signOut();
        cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
        return NextResponse.redirect(`${requestUrl.origin}/auth/error?error_code=building_association_failed&error=${encodeURIComponent(clientIdError || 'Failed to get client ID')}`);
      }

      // Check client subscription status
      const { success: subscriptionSuccess, isActive, error: subscriptionError } = await checkClientSubscriptionStatus(client_id);

      if (!subscriptionSuccess) {
        log(`Subscription check failed for client ID ${client_id}: ${subscriptionError}`, 'error');
        await supabase.auth.signOut();
        cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
        return NextResponse.redirect(`${requestUrl.origin}/auth/error?error_code=subscription_check_failed&error=${encodeURIComponent(subscriptionError || 'Subscription check failed')}`);
      }

      if (!isActive) {
        log(`No active subscription for client ID ${client_id}`, 'info');
        await supabase.auth.signOut();
        cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
        return NextResponse.redirect(`${requestUrl.origin}/auth/error?error_code=no_building_subscription`);
      }

    } catch (error: any) {
      log(`Validation error: ${error.message || 'Unexpected error'}`, 'error');
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        log(`Error signing out user: ${signOutError.message}`, 'error');
      }
      cookieStore.getAll().forEach((c) => cookieStore.delete(c.name));
      return NextResponse.redirect(`${requestUrl.origin}/auth/error?error_code=validation_error&error=${encodeURIComponent(error.message || 'Unexpected error')}`);
    }
  }

  const dashboardUrl = `${requestUrl.origin}/dashboard`;
  return NextResponse.redirect(dashboardUrl);
}
