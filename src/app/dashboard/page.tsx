'use server'

import { getViewer } from "src/libs/supabase/server-auth";
import Dashboard from "./dashboard";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DefaultPageSkeleton } from "src/sections/dashboard/skeletons/default-page-skeleton";
import { listIncidentReports, listIncidentReportsForClient } from "src/app/actions/incident/incident-report-actions";
import { listDashboardEvents } from "src/app/actions/calendar/calendar-actions";
import { readAllCustomerPayments } from "src/app/actions/customer/customer-payment-actions";
import type { PolarOrder } from "src/types/polar-order-types";
import { getBuildingIDsFromUserId } from "src/app/actions/building/building-actions";
import type { IncidentReport } from "src/types/incident-report";

const Page = async () => {

  const { customer, tenant, admin, userData } = await getViewer();
  if (!customer && !tenant && !admin) {
    try {
    } catch (err) {
      console.warn('Logout failed, redirecting anyway', err);
    }
    redirect('/auth/login');
  }

  const customerId = customer?.id ?? null;
  let tenantBuildingIds: string[] = [];
  if (tenant && userData?.id) {
    const buildingRes = await getBuildingIDsFromUserId(userData.id);
    if (buildingRes.success && Array.isArray(buildingRes.data)) {
      tenantBuildingIds = buildingRes.data;
    }
  }

  let incidents: IncidentReport[] = [];
  if (customerId) {
    const incidentsRes = await listIncidentReportsForClient(customerId);
    incidents = incidentsRes.success && Array.isArray(incidentsRes.data) ? incidentsRes.data : [];
  } else if (tenantBuildingIds.length) {
    const incidentsRes = await listIncidentReports({ buildingIds: tenantBuildingIds });
    incidents = incidentsRes.success && Array.isArray(incidentsRes.data) ? incidentsRes.data : [];
  }

  const eventsRes = await listDashboardEvents({ upcomingLimit: 5, pastLimit: 5, upcomingDaysWindow: 10, buildingIds: tenantBuildingIds });
  const events = eventsRes.success ? eventsRes.data : { upcoming: [], past: [] };
  let invoices: PolarOrder[] = [];
  const showTransactions = !!customerId;
  if (customerId) {
    const paymentsRes = await readAllCustomerPayments(customerId);
    if (paymentsRes.readCustomerPaymentsSuccess && Array.isArray(paymentsRes.readCustomerPaymentsData)) {
      invoices = paymentsRes.readCustomerPaymentsData as PolarOrder[];
    }
  }

  return (
    <Suspense fallback={<DefaultPageSkeleton />}>
      <Dashboard incidents={incidents} events={events} invoices={invoices} showTransactions={showTransactions} />
    </Suspense>
  );
};

export default Page;
