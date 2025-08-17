

import { readClientByIdAction } from 'src/app/actions/client/client-actions';
import Account from './account';
import { checkIfUserExistsAndReturnDataAndSessionObject } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { redirect } from 'next/navigation';
import { Client, ClientMember } from 'src/types/client';
import { readAllActiveSubscriptionPlans, readSubscriptionPlanFromClientId } from 'src/app/actions/subscription-plans/subscription-plan-actions';
import { readBillingInfoFromClientId } from 'src/app/actions/client/client-billing-actions';
import { readAllClientPayments } from 'src/app/actions/client/client-payment-actions';
import { SubscriptionPlan } from 'src/types/subscription-plan';
import { ClientBillingInformation } from 'src/types/client-billing-information';
import { Invoice } from 'src/types/payment';
import { readAllClientTeamMembers } from 'src/app/actions/client/client-members';

const Page = async () => {

  let clientData: Client | null = null;
  let clientSubscriptionPlan: SubscriptionPlan | null = null
  let clientBillingInfo: ClientBillingInformation[] | null = null
  let clientInvoices: Invoice[] | null = null
  let allSubscriptions: SubscriptionPlan[] | null = null;
  let allTeamMembers: ClientMember[] | null = null;

  const { client, tenant, admin } = await checkIfUserExistsAndReturnDataAndSessionObject();

  if (!client && !tenant && !admin) {
    logout();
    return null;
  }

  if (client) {

    const [
      { getClientByIdActionSuccess, getClientByIdActionData },
      { readSubscriptionPlanFromClientIdSuccess, subscriptionPlan, readSubscriptionPlanFromClientIdError },
      { readClientBillingInformationSuccess, readClientBillingInformationData, readClientBillingInformationError },
      { readClientPaymentsSuccess, readClientPaymentsData, readClientPaymentsError },
      { readAllActiveSubscriptionPlansSuccess, activeSubscriptionPlansData, readAllActiveSubscriptionPlansError },
      { readAllClientTeamMembersSuccess, readAllClientTeamMembersError, readAllClientTeamMembersData },
    ] = await Promise.all([
      readClientByIdAction(client.id),
      readSubscriptionPlanFromClientId(client.id),
      readBillingInfoFromClientId(client.id),
      readAllClientPayments(client.id),
      readAllActiveSubscriptionPlans(),
      readAllClientTeamMembers(client.id),
    ]);

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

    if (getClientByIdActionSuccess && getClientByIdActionData) {
      clientData = getClientByIdActionData;
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
    client={clientData!}
    clientSubscriptionPlan={clientSubscriptionPlan!}
    clientBillingInfo={clientBillingInfo}
    clientInvoices={clientInvoices}
    subscriptionPlans={allSubscriptions!}
    allTeamMembers={allTeamMembers!}
  />;
};

export default Page;
