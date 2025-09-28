import { readClientByIdAction } from 'src/app/actions/client/client-actions';
import Account from './account';
import { getViewer } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { redirect } from 'next/navigation';
import { Client, ClientMember } from 'src/types/client';
import { readAllActiveSubscriptionPlans, readSubscriptionPlanFromClientId } from 'src/app/actions/subscription-plan/subscription-plan-actions';
import { readBillingInfoFromClientId } from 'src/app/actions/client/client-billing-actions';
import { readAllClientPayments } from 'src/app/actions/client/client-payment-actions';
import { SubscriptionPlan } from 'src/types/subscription-plan';
import { ClientBillingInformation } from 'src/types/client-billing-information';
import { Invoice } from 'src/types/payment';
import { readAllClientTeamMembers } from 'src/app/actions/client/client-members';
import { getAllLogsFromEmail, ServerLog } from 'src/libs/supabase/server-logging';

const Page = async () => {

  let clientSubscriptionPlan: SubscriptionPlan | null = null
  let clientBillingInfo: ClientBillingInformation[] | null = null
  let clientInvoices: Invoice[] | null = null
  let allSubscriptions: SubscriptionPlan[] | null = null;
  let allTeamMembers: ClientMember[] | null = null;
  let allLogsFromEmail: ServerLog[] | null = null;

  const { client, tenant, admin, clientMember, userData } = await getViewer();

  if (!client && !tenant && !admin && !clientMember) {
    logout();
    return null;
  }

  if (clientMember) {
    redirect('/dashboard');
  }

  if (client) {

    const [
      { getClientByIdActionSuccess, getClientByIdActionData },
      { readSubscriptionPlanFromClientIdSuccess, subscriptionPlan, readSubscriptionPlanFromClientIdError },
      { readClientBillingInformationSuccess, readClientBillingInformationData, readClientBillingInformationError },
      { readClientPaymentsSuccess, readClientPaymentsData, readClientPaymentsError },
      { readAllActiveSubscriptionPlansSuccess, activeSubscriptionPlansData, readAllActiveSubscriptionPlansError },
      { readAllClientTeamMembersSuccess, readAllClientTeamMembersError, readAllClientTeamMembersData },
      clientLogs
    ] = await Promise.all([
      readClientByIdAction(client.id),
      readSubscriptionPlanFromClientId(client.id),
      readBillingInfoFromClientId(client.id),
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

    if (readClientBillingInformationSuccess && readClientBillingInformationData) {
      clientBillingInfo = readClientBillingInformationData;
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
  } else if (admin) {
    redirect('/dashboard');
  } else if (tenant) {
    redirect('/dashboard/products');
  }

  return <Account
    client={client!}
    userData={userData!}
    clientSubscriptionPlan={clientSubscriptionPlan!}
    clientBillingInfo={clientBillingInfo}
    clientInvoices={clientInvoices}
    subscriptionPlans={allSubscriptions!}
    allTeamMembers={allTeamMembers!}
    clientLogs={allLogsFromEmail! || []}
  />;
};

export default Page;
