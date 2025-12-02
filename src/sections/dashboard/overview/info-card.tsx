import type { FC, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import type { CardProps } from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { RouterLink } from 'src/components/router-link';

export type OverviewLinkCardProps = CardProps & {
  icon: ReactNode;
  iconTitle: string;
  title: string;
  description: string;
  url: string;
  actionIcon?: ReactNode;
  actionLabel?: string;
};

export const OverviewLinkCard: FC<OverviewLinkCardProps> = ({
  icon,
  iconTitle,
  title,
  description,
  url,
  actionIcon,
  actionLabel,
  ...cardProps
}) => {

  const theme = useTheme();

  return (
    <Card {...cardProps}>
      <CardContent>
        <Box
          sx={{
            alignItems: 'center',
            display: 'flex',
          }}
        >
          <SvgIcon color="primary">
            {icon}
          </SvgIcon>
          <Typography
            color="primary.main"
            sx={{ pl: 1 }}
            variant="subtitle2"
          >
            {iconTitle}
          </Typography>
        </Box>
        <Typography
          sx={{ mt: 2 }}
          variant="h6"
        >
          {title}
        </Typography>
        <Typography
          color="text.secondary"
          sx={{ mt: 1 }}
          variant="body2"
        >
          {description}
        </Typography>
      </CardContent>
      <Divider />
      <CardActions sx={{ backgroundColor: theme.palette.primary.main }}>
        <Button
          component="a"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          variant="contained"
          endIcon={
            actionIcon ? (
              <SvgIcon>
                {actionIcon}
              </SvgIcon>
            ) : undefined
          }
          size="small"
          sx={{
            color: theme.palette.primary.dark,
            backgroundColor: theme.palette.primary.light,
            transition: 'background-color 150ms ease, color 150ms ease',
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
              color: theme.palette.primary.contrastText,
            },
          }}
        >
          {actionLabel ?? iconTitle}
        </Button>

      </CardActions>
    </Card>
  );
};
