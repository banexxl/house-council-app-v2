// src/app/auth/login/page.tsx
import type { Metadata } from 'next';
import LoginFormClient from './login-form-client';
import { Suspense } from 'react';
import { DefaultPageSkeleton } from 'src/sections/dashboard/skeletons/default-page-skeleton';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Login to your account',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<DefaultPageSkeleton />}>
      <LoginFormClient />
    </Suspense>
  )
}
