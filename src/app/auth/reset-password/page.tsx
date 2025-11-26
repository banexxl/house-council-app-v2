import { Suspense } from 'react';
import { ResetPasswordClient } from './reset-password-client';
import { DefaultPageSkeleton } from 'src/sections/dashboard/skeletons/default-page-skeleton';

export const dynamic = 'force-dynamic';

const Page = async () => {
  return (
    <Suspense fallback={<DefaultPageSkeleton />}>
      <ResetPasswordClient />
    </Suspense>
  );
};

export default Page;
