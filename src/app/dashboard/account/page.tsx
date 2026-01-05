import { readClientByIdAction } from 'src/app/actions/client/client-actions';
import Account from './account';
import { getViewer } from 'src/libs/supabase/server-auth';
import { redirect } from 'next/navigation';
import { ClientMember } from 'src/types/client';
import { readAllActiveSubscriptionPlans, readSubscriptionPlanFromClientId } from 'src/app/actions/subscription-plan/subscription-plan-actions';
import { readAllClientPayments } from 'src/app/actions/client/client-payment-actions';
import { SubscriptionPlan } from 'src/types/subscription-plan';
import { PolarOrder } from 'src/types/polar-order-types';
import { readAllClientTeamMembers } from 'src/app/actions/client/client-members';
import { getAllLogsFromEmail, ServerLog } from 'src/libs/supabase/server-logging';

const Page = async () => {

  let clientSubscriptionPlan: SubscriptionPlan | null = null
  let clientInvoices: PolarOrder[] | null = null
  let allSubscriptions: SubscriptionPlan[] | null = null;
  let allTeamMembers: ClientMember[] | null = null;
  let allLogsFromEmail: ServerLog[] | null = null;

  const { client, tenant, admin, clientMember, userData } = await getViewer();

  if (!client && !tenant && !admin && !clientMember) {
    redirect('/auth/login');
  }

  if (client) {

    const [
      { getClientByIdActionSuccess, getClientByIdActionData },
      { readSubscriptionPlanFromClientIdSuccess, subscriptionPlan, readSubscriptionPlanFromClientIdError },
      { readClientPaymentsSuccess, readClientPaymentsData, readClientPaymentsError },
      { readAllActiveSubscriptionPlansSuccess, activeSubscriptionPlansData, readAllActiveSubscriptionPlansError },
      { readAllClientTeamMembersSuccess, readAllClientTeamMembersError, readAllClientTeamMembersData },
      clientLogs
    ] = await Promise.all([
      readClientByIdAction(client.id),
      readSubscriptionPlanFromClientId(client.id),
      readAllClientPayments(client.id),
      readAllActiveSubscriptionPlans(),
      readAllClientTeamMembers(client.id),
      getAllLogsFromEmail(client.email)
    ]);

    if (clientLogs) {
      allLogsFromEmail = clientLogs;
    }

    if (readSubscriptionPlanFromClientIdSuccess && subscriptionPlan) {
      clientSubscriptionPlan = subscriptionPlan;
    }

    if (readClientPaymentsSuccess && readClientPaymentsData) {
      clientInvoices = readClientPaymentsData;
    }

    if (readAllActiveSubscriptionPlansSuccess && activeSubscriptionPlansData) {
      allSubscriptions = activeSubscriptionPlansData;
    }

    if (readAllClientTeamMembersSuccess && readAllClientTeamMembersData) {
      allTeamMembers = readAllClientTeamMembersData;
    }
  } else if (clientMember) {
    redirect('/dashboard');
  } else if (tenant) {
    redirect('/dashboard/social/profile');
  }

  return <Account
    client={client!}
    userData={userData!}
    clientSubscriptionPlan={clientSubscriptionPlan!}
    clientInvoices={clientInvoices}
    subscriptionPlans={allSubscriptions!}
    allTeamMembers={allTeamMembers!}
    clientLogs={allLogsFromEmail! || []}
  />;
};

export default Page;
