'use client';

import { useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles/createTheme';
import Link from 'next/link';

import { RouterLink } from 'src/components/router-link';
import { Seo } from 'src/components/seo';
import { paths } from 'src/paths';
import { useTheme } from '@mui/material';

const errorMessages: Record<string, string> = {
  otp_expired: 'The email link is invalid or has expired. Please try signing in again.',
  access_denied: 'Access to this resource was denied. Please check your permissions.',
  unknown_error: 'An unknown error occurred. Please try again later.',
  not_found_in_db: 'Customer not found.',
  email_not_registered: 'Email not registered. Please sign up.',
  no_subscription: 'No active subscription found. Please subscribe to continue.',
};

export const ErrorClient = () => {
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error_code') || 'access_denied'; // Default to access_denied
  const errorMessage = errorMessages[errorCode] || 'An unexpected error occurred.';
  const theme = useTheme();
  return (
    <>
      <Seo title="Error: Authorization Required" />
      <Box
        component="main"
        sx={{
          alignItems: 'center',
          display: 'flex',
          flexGrow: 1,
          py: '80px',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 6,
            }}
          >
            <Box
              alt="Not authorized"
              component="img"
              src="/assets/errors/error-401.png"
              sx={{
                height: 'auto',
                width: 200,
              }}
            />
          </Box>
          <Typography
            align="center"
            variant={mdUp ? 'h1' : 'h4'}
          >
            {errorCode === 'otp_expired' ? 'OTP Expired' : '401: Authorization required'}
          </Typography>
          <Typography
            align="center"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            {errorMessage}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              mt: 6,
              gap: 4
            }}
          >
            <Button
              component={RouterLink}
              href={paths.auth.login}
            >
              Back to Login
            </Button>
            {errorCode === 'no_subscription' && (
              <Link
                style={{
                  textDecoration: 'none',
                  color: theme.palette.primary.main,
                  fontSize: '0.875rem',
                }}
                href="https://nest-link.app/pricing"
                target="_blank"
                rel="noopener noreferrer"
              >
                Subscribe Now
              </Link>
            )}
          </Box>
        </Container>
      </Box>
    </>
  );
};
