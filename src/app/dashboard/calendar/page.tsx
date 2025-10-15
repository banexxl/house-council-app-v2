"use server";

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import { Seo } from 'src/components/seo';
import CalendarClient from './calendar';
import { getCalendarEvents } from 'src/app/actions/calendar/calendar-actions';
import type { CalendarEvent } from 'src/types/calendar';

const Page = async () => {
  const result = await getCalendarEvents();
  const events: CalendarEvent[] = result.success ? result.data : [];



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
            <CalendarClient initialEvents={events} />
          </Card>
        </Container>
      </Box>
    </>
  );
};

export default Page;
