'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import { Box } from '@mui/system';
import { RouterLink } from 'src/components/router-link';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

export type BreadcrumbItem = {
  title: string;
  href?: string;
};

interface EntityFormHeaderProps {
  backHref: string;
  backLabel: string;
  title: string;
  breadcrumbs?: BreadcrumbItem[];
}

export const EntityFormHeader = (props: EntityFormHeaderProps) => {
  const { backHref, backLabel, title, breadcrumbs } = props;

  return (
    <Box>
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
      <Typography variant="h4" sx={{ mt: 2 }}>
        {title}
      </Typography>

      {Array.isArray(breadcrumbs) && breadcrumbs.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Breadcrumbs separator={<KeyboardArrowRightIcon />}>
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
        </Box>
      )}
    </Box>
  );
};

