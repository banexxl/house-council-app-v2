"use server";

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import { Seo } from 'src/components/seo';
import CalendarClient, { CalendarClientProps } from './calendar';
import { getCalendarEvents, getCalendarEventsByBuildingId } from 'src/app/actions/calendar/calendar-actions';
import { getViewer } from 'src/libs/supabase/server-auth';
import type { CalendarEvent } from 'src/types/calendar';
import { getAllBuildingsFromClient } from 'src/app/actions/building/building-actions';
import type { Building } from 'src/types/building';
import { getBuildingIdFromTenantId } from 'src/app/actions/tenant/tenant-actions';

const Page = async () => {
  const { customer, tenant, admin } = await getViewer();
  const clientId = customer ? customer.id : null;
  let events: CalendarEvent[] = [];
  if (customer || admin) {
    const result = await getCalendarEvents();
    events = result.success ? result.data : [];
  } else if (tenant) {
    const { success: bSuccess, data: buildingId } = await getBuildingIdFromTenantId(tenant.id);
    if (bSuccess && buildingId) {
      const result = await getCalendarEventsByBuildingId(buildingId);
      events = result.success ? result.data : [];
    }
  }
  let buildings: Building[] = [];
  if (clientId) {
    const { success, data } = await getAllBuildingsFromClient(clientId);
    if (success && data) buildings = data;
  }

  return (
    <Container maxWidth="xl">
      <Card sx={{ p: 2 }}>
        <CalendarClient
          initialEvents={events}
          clientId={clientId}
          isTenant={!!tenant && !admin}
          isAdmin={!!admin}
          buildings={buildings}
        />
      </Card>
    </Container>
  );
};

export default Page;
