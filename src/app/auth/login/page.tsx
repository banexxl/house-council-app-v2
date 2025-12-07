// src/app/auth/login/page.tsx
import LoginFormClient from './login-form-client';
import { Suspense } from 'react';
import { DefaultPageSkeleton } from 'src/sections/dashboard/skeletons/default-page-skeleton';

type LoginPageProps = {
  searchParams?: {
    redirect?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const redirectParam = searchParams?.redirect;

  // Basic safety so we don't redirect to external URLs
  const safeRedirect =
    redirectParam && redirectParam.startsWith('/')
      ? redirectParam
      : '/dashboard';

  return (
    <Suspense fallback={<DefaultPageSkeleton />}>
      <LoginFormClient redirect={safeRedirect} />
    </Suspense>
  );
}
