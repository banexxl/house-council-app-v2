// src/app/auth/login/page.tsx
import { Suspense } from 'react';
import LoginForm from './login-form';
import { Box, CircularProgress } from '@mui/material';

type LoginPageProps = {
  searchParams: Promise<{
    redirect?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectParam = params.redirect;

  // Basic safety so we don't redirect to external URLs
  const safeRedirect =
    redirectParam && redirectParam.startsWith('/')
      ? redirectParam
      : '/dashboard';

  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress color='primary' />
        </Box>
      }
    >
      <LoginForm safeRedirect={safeRedirect} />
    </Suspense>
  );
}
