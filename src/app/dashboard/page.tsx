'use server'

import { getViewer } from "src/libs/supabase/server-auth";
import Dashboard from "./dashboard";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DefaultPageSkeleton } from "src/sections/dashboard/skeletons/default-page-skeleton";
import { listIncidentReports, listIncidentReportsForClient } from "src/app/actions/incident/incident-report-actions";
import { listDashboardEvents } from "src/app/actions/calendar/calendar-actions";
import { readAllClientPayments } from "src/app/actions/client/client-payment-actions";
import type { PolarOrder } from "src/types/polar-order-types";
import { getBuildingIDsFromUserId } from "src/app/actions/building/building-actions";
import type { IncidentReport } from "src/types/incident-report";

const Page = async () => {

  const { client, tenant, admin, clientMember, userData } = await getViewer();
  if (!client && !tenant && !admin && !clientMember) {
    try {
    } catch (err) {
      console.warn('Logout failed, redirecting anyway', err);
    }
    redirect('/auth/login');
  }

  const clientId = client?.id || clientMember?.customerId || null;
  let tenantBuildingIds: string[] = [];
  if (tenant && userData?.id) {
    const buildingRes = await getBuildingIDsFromUserId(userData.id);
    if (buildingRes.success && Array.isArray(buildingRes.data)) {
      tenantBuildingIds = buildingRes.data;
    }
  }

  let incidents: IncidentReport[] = [];
  if (clientId) {
    const incidentsRes = await listIncidentReportsForClient(clientId);
    incidents = incidentsRes.success && Array.isArray(incidentsRes.data) ? incidentsRes.data : [];
  } else if (tenantBuildingIds.length) {
    const incidentsRes = await listIncidentReports({ buildingIds: tenantBuildingIds });
    incidents = incidentsRes.success && Array.isArray(incidentsRes.data) ? incidentsRes.data : [];
  }

  const eventsRes = await listDashboardEvents({ upcomingLimit: 5, pastLimit: 5, upcomingDaysWindow: 10, buildingIds: tenantBuildingIds });
  const events = eventsRes.success ? eventsRes.data : { upcoming: [], past: [] };
  let invoices: PolarOrder[] = [];
  const showTransactions = !!clientId;
  if (clientId) {
    const paymentsRes = await readAllClientPayments(clientId);
    if (paymentsRes.readClientPaymentsSuccess && Array.isArray(paymentsRes.readClientPaymentsData)) {
      invoices = paymentsRes.readClientPaymentsData as PolarOrder[];
    }
  }

  return (
    <Suspense fallback={<DefaultPageSkeleton />}>
      <Dashboard incidents={incidents} events={events} invoices={invoices} showTransactions={showTransactions} />
    </Suspense>
  );
};

export default Page;
