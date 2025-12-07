// src/app/auth/login/page.tsx
import { Suspense } from 'react';
import { DefaultPageSkeleton } from 'src/sections/dashboard/skeletons/default-page-skeleton';
import LoginForm from './login-form';

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
    <Suspense fallback={<DefaultPageSkeleton />}>
      <LoginForm safeRedirect={safeRedirect} />
    </Suspense>
  );
}
