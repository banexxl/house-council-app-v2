import type { FC } from 'react';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import SvgIcon from '@mui/material/SvgIcon';
import ArrowRightIcon from '@untitled-ui/icons-react/build/esm/ArrowRight';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';
import { useTransition } from 'react';
import { RouterLink } from 'src/components/router-link';

interface OverviewStatusCardProps {
  label: string;
  count: number;
  color: string;
  bg: string;
  icon: React.ReactNode;
  href: string;
  subtitle?: string;
  total?: number;
}

export const OverviewStatusCard: FC<OverviewStatusCardProps> = ({ label, count, color, bg, icon, href, subtitle, total }) => {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const percentage = total ? Math.round((count / total) * 100) : null;
  return (
    <Card sx={{ px: 3, py: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar sx={{ bgcolor: bg, color, width: 44, height: 44 }}>
          {icon}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography color="text.secondary" variant="body2">
            {label}
          </Typography>
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography color="text.primary" variant="h4">
              {count}
            </Typography>
            {percentage !== null && (
              <Typography variant="caption" color="text.secondary">
                {percentage} {t('dashboard.overview.percentOfTotal', '% of total')}
              </Typography>
            )}
          </Stack>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
      <Box sx={{ mt: 'auto' }}>
        <Button
          component={RouterLink}
          href={href}
          variant="contained"
          color="primary"
          size="small"
          endIcon={
            isPending ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SvgIcon fontSize="small">
                <ArrowRightIcon />
              </SvgIcon>
            )
          }
          sx={{ textTransform: 'none', px: 1.5, minWidth: 'fit-content' }}
          disabled={isPending}
          onClick={() => startTransition(() => { })}
        >
          {t('incident.overview.viewLink', 'View service requests')}
        </Button>
      </Box>
    </Card>
  );
};
