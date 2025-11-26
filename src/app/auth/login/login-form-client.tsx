// src/app/auth/login/login-form-client.tsx
'use client';

import dynamic from 'next/dynamic';

const LoginForm = dynamic(() => import('./login-form'), {
     ssr: false, // prevent server-side rendering of LoginForm
     // Optional loading UI:
     // loading: () => <div>Loading login…</div>,
});

export default function LoginFormClient() {
     return <LoginForm />;
}
