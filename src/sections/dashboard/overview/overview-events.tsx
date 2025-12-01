import type { FC } from 'react';
import { format } from 'date-fns';
import ArrowRightIcon from '@untitled-ui/icons-react/build/esm/ArrowRight';
import CalendarIcon from '@untitled-ui/icons-react/build/esm/Calendar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import ListItemText from '@mui/material/ListItemText';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { CalendarEvent } from 'src/types/calendar';
import { RouterLink } from 'src/components/router-link';

interface OverviewEventsProps {
  upcoming?: CalendarEvent[];
  past?: CalendarEvent[];
}

export const OverviewEvents: FC<OverviewEventsProps> = ({ upcoming = [], past = [] }) => {
  const { t } = useTranslation();
  const safeUpcoming = Array.isArray(upcoming) ? upcoming : [];
  const safePast = Array.isArray(past) ? past : [];

  return (
    <Card>
      <CardHeader
        title={t('calendar.upcomingTitle', 'Upcoming events')}
        subheader={t('calendar.upcomingSubtitle', 'Your next scheduled events')}
      />
      <CardContent sx={{ pt: 0 }}>
        <List disablePadding>
          {safeUpcoming.map((event) => {
            const start = new Date(event.start_date_time || event.created_at);
            const isValid = !Number.isNaN(start.getTime());
            const month = isValid ? format(start, 'LLL').toUpperCase() : '--';
            const day = isValid ? format(start, 'd') : '--';
            const timeText = isValid ? format(start, 'p') : undefined;
            const dateText = isValid ? format(start, 'PPP') : t('calendar.dateTbd', 'Date to be determined');
            return (
              <ListItem
                disableGutters
                sx={{ py: 1.5 }}
                key={event.id}
              >
                <ListItemAvatar>
                  <Box
                    sx={{
                      p: 1,
                      backgroundColor: (theme) =>
                        theme.palette.mode === 'dark' ? 'success.900' : 'success.50',
                      borderRadius: 2,
                      maxWidth: 'fit-content',
                      border: 1,
                      borderColor: 'success.light',
                    }}
                  >
                    <Typography
                      align="center"
                      color="text.primary"
                      variant="caption"
                    >
                      {month}
                    </Typography>
                    <Typography
                      align="center"
                      color="text.primary"
                      variant="h6"
                    >
                      {day}
                    </Typography>
                  </Box>
                </ListItemAvatar>
                <ListItemText>
                  <Typography variant="subtitle2">{event.title}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {event.description || dateText}
                    {timeText ? ` • ${timeText}` : ''}
                  </Typography>
                </ListItemText>
                <ListItemSecondaryAction>
                  <IconButton color="inherit">
                    <SvgIcon fontSize="small">
                      <CalendarIcon />
                    </SvgIcon>
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {t('calendar.pastTitle', 'Recently past')}
        </Typography>
        <List disablePadding>
          {safePast.map((event) => {
            const start = new Date(event.start_date_time || event.created_at);
            const isValid = !Number.isNaN(start.getTime());
            const month = isValid ? format(start, 'LLL').toUpperCase() : '--';
            const day = isValid ? format(start, 'd') : '--';
            const timeText = isValid ? format(start, 'p') : undefined;
            const dateText = isValid ? format(start, 'PPP') : t('calendar.dateTbd', 'Date to be determined');
            return (
              <ListItem
                disableGutters
                sx={{ py: 1.5, opacity: 0.7 }}
                key={event.id}
              >
                <ListItemAvatar>
                  <Box
                    sx={{
                      p: 1,
                      backgroundColor: (theme) =>
                        theme.palette.mode === 'dark' ? 'neutral.900' : 'neutral.200',
                      borderRadius: 2,
                      maxWidth: 'fit-content',
                      border: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <Typography align="center" color="text.primary" variant="caption">
                      {month}
                    </Typography>
                    <Typography align="center" color="text.primary" variant="h6">
                      {day}
                    </Typography>
                  </Box>
                </ListItemAvatar>
                <ListItemText>
                  <Typography variant="subtitle2">{event.title}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {event.description || dateText}
                    {timeText ? ` • ${timeText}` : ''}
                  </Typography>
                </ListItemText>
                <ListItemSecondaryAction>
                  <IconButton color="inherit">
                    <SvgIcon fontSize="small">
                      <CalendarIcon />
                    </SvgIcon>
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
          {!upcoming.length && (
            <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
              {t('calendar.noUpcoming', 'No upcoming events in the next 10 days.')}
            </Typography>
          )}
        </List>
      </CardContent>
      <Divider />
      <CardActions>
        <Button
          component={RouterLink}
          href="/dashboard/calendar"
          color="inherit"
          endIcon={
            <SvgIcon>
              <ArrowRightIcon />
            </SvgIcon>
          }
          size="small"
        >
          {t('calendar.viewAll', 'View calendar')}
        </Button>
      </CardActions>
    </Card>
  );
};
