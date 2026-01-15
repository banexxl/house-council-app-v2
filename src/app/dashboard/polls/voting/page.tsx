import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getViewer } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { getTenantBuildingPolls, getTenantClosedPolls } from 'src/app/actions/poll/votes/voting-actions';
import { Voting } from './voting';
import { paths } from 'src/paths';

export const metadata: Metadata = {
     title: 'Voting | House Council',
     description: 'Vote on active polls for your building',
};

export default async function VotingPage() {
     const { customer, tenant, admin } = await getViewer();

     if (!customer && !tenant && !admin) {
          redirect(paths.auth.login);
     }

     // Only tenants can access voting page
     if (!tenant) {
          notFound();
     }

     const { data: polls } = await getTenantBuildingPolls();
     const { data: closedPolls } = await getTenantClosedPolls();

     return (
          <Voting
               polls={polls && polls.length > 0 ? polls : []}
               closedPolls={closedPolls && closedPolls.length > 0 ? closedPolls : []}
               tenant={tenant}
          />
     );
}
