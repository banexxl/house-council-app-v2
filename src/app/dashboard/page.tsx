'use server'

import { getViewer } from "src/libs/supabase/server-auth";
import Dashboard from "./dashboard";
import { redirect } from "next/navigation";
import { logout } from "../auth/actions";
import { Suspense } from "react";
import { DefaultPageSkeleton } from "src/sections/dashboard/skeletons/default-page-skeleton";
import { listIncidentReportsForViewer } from "src/app/actions/incident/incident-report-actions";
import { listDashboardEvents } from "src/app/actions/calendar/calendar-actions";

const Page = async () => {

  const { client, tenant, admin, clientMember } = await getViewer();
  if (!client && !tenant && !admin && !clientMember) {
    await logout();
    redirect('/auth/login');
  }

  if (tenant) {
    redirect('/dashboard/social/profile');
  }

  const incidentsRes = await listIncidentReportsForViewer();
  const incidents = incidentsRes.success && Array.isArray(incidentsRes.data) ? incidentsRes.data : [];
  const eventsRes = await listDashboardEvents({ upcomingLimit: 5, pastLimit: 5, upcomingDaysWindow: 10 });
  const events = eventsRes.success ? eventsRes.data : { upcoming: [], past: [] };

  return (
    <Suspense fallback={<DefaultPageSkeleton />}>
      <Dashboard incidents={incidents} events={events} />
    </Suspense>
  );
};

export default Page;
