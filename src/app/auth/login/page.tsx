// src/app/auth/login/page.tsx
import type { Metadata } from 'next';
import LoginFormClient from './login-form-client';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Login to your account',
};

export default function LoginPage() {
  return <LoginFormClient />;
}
