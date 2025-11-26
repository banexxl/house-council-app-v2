import { Suspense } from 'react';
import { ErrorClient } from './error-client';
import { DefaultPageSkeleton } from 'src/sections/dashboard/skeletons/default-page-skeleton';

export const dynamic = 'force-dynamic';

const Page = async () => {
  return (
    <Suspense fallback={<DefaultPageSkeleton />}>
      <ErrorClient />
    </Suspense>
  );
};

export default Page;
