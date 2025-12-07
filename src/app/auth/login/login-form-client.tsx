// src/app/auth/login/login-form-client.tsx
'use client';

import dynamic from 'next/dynamic';

type LoginFormProps = {
     redirect: string;
};

const LoginForm = dynamic<LoginFormProps>(() => import('./login-form'), {
     ssr: false,
     // loading: () => <div>Loading login…</div>,
});

export default function LoginFormClient(props: LoginFormProps) {
     // just forward everything to the real form
     return <LoginForm {...props} />;
}
