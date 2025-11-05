import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getViewer } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { getTenantBuildingPolls, getTenantClosedPolls } from 'src/app/actions/poll/votes/voting-actions';
import { Voting } from './voting';

export const metadata: Metadata = {
     title: 'Voting | House Council',
     description: 'Vote on active polls for your building',
};

export default async function VotingPage() {
     const { client, clientMember, tenant, admin } = await getViewer();

     if (!client && !clientMember && !tenant && !admin) {
          logout();
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
