import { Suspense } from 'react';
import { ApprovalResultClient } from './approval-result-client';
import { DefaultPageSkeleton } from 'src/sections/dashboard/skeletons/default-page-skeleton';

const ApprovalResultPage = () => {
     return (
          <Suspense fallback={<DefaultPageSkeleton />}>
               <ApprovalResultClient />
          </Suspense>
     );
};

export default ApprovalResultPage;
