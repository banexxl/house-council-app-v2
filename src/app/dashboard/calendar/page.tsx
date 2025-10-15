"use server";

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import { Seo } from 'src/components/seo';
import CalendarClient, { CalendarClientProps } from './calendar';
import { getCalendarEvents } from 'src/app/actions/calendar/calendar-actions';
import { getViewer } from 'src/libs/supabase/server-auth';
import type { CalendarEvent } from 'src/types/calendar';

const Page = async () => {
  const result = await getCalendarEvents();
  const events: CalendarEvent[] = result.success ? result.data : [];
  const { client, clientMember, tenant, admin } = await getViewer();
  const clientId = client ? client.id : clientMember ? clientMember.client_id : null;



  return (
    <>
      <Seo title="Dashboard: Calendar" />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8,
        }}
      >
        <Container maxWidth="xl">
          <Card sx={{ p: 2 }}>
            <CalendarClient initialEvents={events} clientId={clientId} isTenant={!!tenant && !admin} isAdmin={!!admin} />
          </Card>
        </Container>
      </Box>
    </>
  );
};

export default Page;
