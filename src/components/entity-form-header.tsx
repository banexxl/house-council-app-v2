'use client';

import { useMemo, useState, type ReactNode } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Box, Stack } from '@mui/system';
import { RouterLink } from 'src/components/router-link';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import PlusIcon from '@untitled-ui/icons-react/build/esm/Plus';
import { Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';

export type BreadcrumbItem = {
  title: string;
  href?: string;
};

interface EntityFormHeaderProps {
  backHref: string;
  backLabel: string;
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void;
  actionDisabled?: boolean;
  actionComponent?: ReactNode;
}

export const EntityFormHeader = (props: EntityFormHeaderProps) => {
  const {
    backHref,
    backLabel,
    title,
    breadcrumbs,
    actionLabel,
    actionHref,
    onActionClick,
    actionDisabled,
    actionComponent,
  } = props;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const shouldRenderAction = Boolean(actionComponent || (actionLabel && (actionHref || onActionClick)));
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { t } = useTranslation();

  const renderedAction = useMemo(() => {
    if (!shouldRenderAction) {
      return null;
    }

    if (actionComponent) {
      return actionComponent;
    }

    if (!actionLabel) {
      return null;
    }

    const linkProps = actionHref
      ? { component: RouterLink, href: actionHref }
      : {};

    return (
      <Button
        {...linkProps}
        onClick={(event) => {
          if (actionDisabled || isActionLoading) return;
          if (onActionClick) {
            setIsActionLoading(true);
            Promise.resolve(onActionClick()).finally(() => setIsActionLoading(false));
          }
        }}
        variant="contained"
        size={isMobile ? 'small' : 'medium'}
        startIcon={
          isActionLoading ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <SvgIcon>
              <PlusIcon />
            </SvgIcon>
          )
        }
        disabled={actionDisabled || isActionLoading}
        aria-label={isMobile ? actionLabel : undefined}
        sx={{
          minWidth: isMobile ? 0 : undefined,
          height: 36,
          px: isMobile ? 1 : 1.5,
          '& .MuiButton-startIcon': { mr: isMobile ? 0 : 0.5 },
        }}
      >
        {isMobile ? null : actionLabel}
      </Button>
    );
  }, [actionComponent, actionHref, actionDisabled, actionLabel, isActionLoading, isMobile, onActionClick, shouldRenderAction]);

  return (
    <Box>
      <Box>
        {/* Row 1: Back link */}
        <Link
          color="text.primary"
          component={RouterLink}
          href={backHref}
          sx={{ alignItems: 'center', display: 'inline-flex' }}
          underline="hover"
        >
          <SvgIcon sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </SvgIcon>
          <Typography variant="subtitle2">{backLabel}</Typography>
        </Link>

        {/* Row 2: Title + Action button on the same line */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={{ xs: 1.5, sm: 2 }}
          sx={{ mt: { xs: 1, sm: 2 } }}
        >
          <Typography variant="h4">
            {title}
          </Typography>

          {renderedAction ? (
            <Box sx={{ flexShrink: 0 }}>
              {renderedAction}
            </Box>
          ) : null}
        </Stack>

        {/* Breadcrumbs stay the same below */}
        {Array.isArray(breadcrumbs) && breadcrumbs.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {/* ... your Breadcrumbs code ... */}
          </Box>
        )}
      </Box>


      {Array.isArray(breadcrumbs) && breadcrumbs.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Breadcrumbs
            separator={<KeyboardArrowRightIcon />}
            sx={{
              fontSize: { xs: 12, sm: 14 },
              '& a, & p': { fontSize: { xs: 12, sm: 14 } },
              flexWrap: 'wrap',
            }}
          >
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              if (isLast || !item.href) {
                return (
                  <Typography color="text.secondary" key={index} variant="subtitle2">
                    {item.title}
                  </Typography>
                );
              }
              return (
                <Link
                  color="text.primary"
                  component={RouterLink}
                  href={item.href}
                  key={index}
                  variant="subtitle2"
                >
                  {item.title}
                </Link>
              );
            })}
          </Breadcrumbs>
          <Alert severity="info" sx={{ mt: 2 }}>
            {t('common.notificationWillBeSent')}
          </Alert>
        </Box>
      )}
    </Box>
  );
};
