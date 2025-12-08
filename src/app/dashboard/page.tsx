'use server'

import { getViewer } from "src/libs/supabase/server-auth";
import Dashboard from "./dashboard";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DefaultPageSkeleton } from "src/sections/dashboard/skeletons/default-page-skeleton";
import { listIncidentReports, listIncidentReportsForClient } from "src/app/actions/incident/incident-report-actions";
import { listDashboardEvents } from "src/app/actions/calendar/calendar-actions";
import { readAllClientPayments } from "src/app/actions/client/client-payment-actions";
import type { Invoice, InvoiceStatus } from "src/types/invoice";
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

  const clientId = client?.id || clientMember?.client_id || null;
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
  let invoices: Invoice[] = [];
  const showTransactions = !!clientId;
  if (clientId) {
    const paymentsRes = await readAllClientPayments(clientId);
    if (paymentsRes.readClientPaymentsSuccess && Array.isArray(paymentsRes.readClientPaymentsData)) {
      invoices = paymentsRes.readClientPaymentsData.map((p: any) => ({
        id: p.id,
        currency: p.currency || '',
        client: {
          name: p.client?.name || p.client?.company || p.client?.contact_person || p.client?.email || '',
          email: p.client?.email || '',
          address: p.billing_information?.address || p.billing_information?.street_address,
          company: p.client?.company || p.client?.company_name,
          taxId: p.client?.tax_id || p.billing_information?.tax_id,
        },
        issueDate: p.created_at ? new Date(p.created_at).getTime() : undefined,
        dueDate: p.due_date ? new Date(p.due_date).getTime() : undefined,
        number: p.invoice_number || p.number || '',
        status: (p.status as InvoiceStatus) || 'pending',
        subtotalAmount: p.subtotal_amount ?? undefined,
        taxAmount: p.tax_amount ?? undefined,
        totalAmount: p.total_paid ?? p.totalAmount ?? 0,
      }));
    }
  }

  return (
    <Suspense fallback={<DefaultPageSkeleton />}>
      <Dashboard incidents={incidents} events={events} invoices={invoices} showTransactions={showTransactions} />
    </Suspense>
  );
};

export default Page;
