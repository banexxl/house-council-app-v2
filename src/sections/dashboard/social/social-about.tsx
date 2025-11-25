'use client'

import type { FC } from 'react';
import PropTypes from 'prop-types';
import Briefcase01Icon from '@mui/icons-material/Work';
import Home02Icon from '@mui/icons-material/Home';
import Mail01Icon from '@mui/icons-material/Email';
import Phone01Icon from '@mui/icons-material/Phone';
import CakeIcon from '@mui/icons-material/Cake';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

interface SocialAboutProps {
  currentCity: string;
  currentJobCompany: string;
  currentJobTitle: string;
  email: string;
  originCity: string;
  previousJobCompany: string;
  previousJobTitle: string;
  profileProgress: number;
  phoneNumber: string;
  quote: string;
  dateOfBirth: string;
}

export const SocialAbout: FC<SocialAboutProps> = (props) => {
  const {
    currentCity,
    currentJobCompany,
    currentJobTitle,
    email,
    phoneNumber,
    originCity,
    previousJobCompany,
    previousJobTitle,
    profileProgress,
    quote,
    dateOfBirth,
    ...other
  } = props;

  const { t } = useTranslation();

  // Format date of birth to readable format
  const formattedDateOfBirth = dateOfBirth
    ? new Date(dateOfBirth).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    : '';

  return (
    <Stack
      spacing={3}
      {...other}
    >
      <Card>
        <CardHeader title={t('tenants.socialAboutProfileProgress')} />
        <CardContent>
          <Stack spacing={2}>
            <LinearProgress
              value={profileProgress}
              variant="determinate"
            />
            <Typography
              color="text.secondary"
              variant="subtitle2"
            >
              {t('tenants.socialAboutSetupComplete', { progress: profileProgress })}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardHeader title={t('tenants.socialAboutTitle')} />
        <CardContent>
          <Typography
            variant="h6"
          >
            {t('tenants.socialAboutQuote')}
          </Typography>
          <Typography
            color="text.secondary"
            variant="subtitle2"
          >
            &quot;
            {quote}
            &quot;
          </Typography>
          <List disablePadding>
            <ListItem
              disableGutters
              divider
            >
              <ListItemAvatar>
                <SvgIcon color="action">
                  <Briefcase01Icon />
                </SvgIcon>
              </ListItemAvatar>
              <ListItemText
                disableTypography
                primary={
                  <Typography variant="subtitle2">
                    {currentJobTitle} {t('tenants.socialAboutAt')}{' '}
                    {currentJobCompany}
                  </Typography>
                }
                secondary={
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    {t('tenants.socialAboutPast')} {previousJobTitle}{' '}
                    {previousJobCompany}
                  </Typography>
                }
              />
            </ListItem>
            {/* <ListItem
              disableGutters
              divider
            >
              <ListItemAvatar>
                <SvgIcon color="action">
                  <BookOpen01Icon />
                </SvgIcon>
              </ListItemAvatar>
              <ListItemText
                primary={
                    {t('tenants.socialAboutAddSchool')}
                }
              />
            </ListItem> */}
            <ListItem
              disableGutters
              divider
            >
              <ListItemAvatar>
                <SvgIcon color="action">
                  <Home02Icon />
                </SvgIcon>
              </ListItemAvatar>
              <ListItemText
                disableTypography
                primary={
                  <Typography variant="subtitle2">
                    {t('tenants.socialAboutLivesIn')}{' '}
                    {currentCity}
                  </Typography>
                }
                secondary={
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    {t('tenants.socialAboutOriginallyFrom')}{' '}
                    <Link
                      color="text.secondary"
                      href="#"
                      variant="body2"
                    >
                      {originCity}
                    </Link>
                  </Typography>
                }
              />
            </ListItem>
            <ListItem disableGutters divider>
              <ListItemAvatar>
                <SvgIcon color="action">
                  <Mail01Icon />
                </SvgIcon>
              </ListItemAvatar>
              <ListItemText primary={<Typography variant="subtitle2">{email}</Typography>} />
            </ListItem>
            <ListItem disableGutters divider>
              <ListItemAvatar>
                <SvgIcon color="action">
                  <Phone01Icon />
                </SvgIcon>
              </ListItemAvatar>
              <ListItemText primary={<Typography variant="subtitle2">{phoneNumber}</Typography>} />
            </ListItem>
            <ListItem disableGutters>
              <ListItemAvatar>
                <SvgIcon color="action">
                  <CakeIcon />
                </SvgIcon>
              </ListItemAvatar>
              <ListItemText primary={<Typography variant="subtitle2">{formattedDateOfBirth}</Typography>} />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Stack>
  );
};

SocialAbout.propTypes = {
  currentCity: PropTypes.string.isRequired,
  currentJobCompany: PropTypes.string.isRequired,
  currentJobTitle: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  originCity: PropTypes.string.isRequired,
  previousJobCompany: PropTypes.string.isRequired,
  previousJobTitle: PropTypes.string.isRequired,
  profileProgress: PropTypes.number.isRequired,
  quote: PropTypes.string.isRequired,
};
