import { getViewer } from 'src/libs/supabase/server-auth';
import { redirect } from 'next/navigation';
import { readAllActiveSubscriptionPlans, readCustomerSubscriptionPlanFromCustomerId } from 'src/app/actions/subscription-plan/subscription-plan-actions';
import { PolarOrder } from 'src/types/polar-order-types';
import { getAllLogsFromEmail, ServerLog } from 'src/libs/supabase/server-logging';
import { readCustomerByIdAction } from 'src/app/actions/customer/customer-actions';
import { readAllCustomerPayments } from 'src/app/actions/customer/customer-payment-actions';
import { PolarSubscription } from 'src/types/polar-subscription-types';
import { PolarProduct } from 'src/types/polar-product-types';
// import Account from './account';s

const Page = async () => {

     // let customerSubscriptionPlan: PolarSubscription | null = null
     // let customerInvoices: PolarOrder[] | null = null
     // let allSubscriptions: PolarProduct[] | null = null;
     // let allLogsFromEmail: ServerLog[] | null = null;

     const { customer, tenant, admin, userData } = await getViewer();

     if (!customer && !tenant && !admin) {
          redirect('/auth/login');
     } else {
          redirect('/dashboard/');
     }

     // if (customer) {

     //      const [
     //           { getCustomerByIdActionSuccess, getCustomerByIdActionData },
     //           { success: readSubscriptionPlanFromCustomerIdSuccess, customerSubscriptionPlanData: subscriptionPlan, error: readSubscriptionPlanFromCustomerIdError },
     //           { readCustomerPaymentsSuccess, readCustomerPaymentsData, readCustomerPaymentsError },
     //           { readAllActiveSubscriptionPlansSuccess, activeSubscriptionPlansData, readAllActiveSubscriptionPlansError },
     //           customerLogs
     //      ] = await Promise.all([
     //           readCustomerByIdAction(customer.id),
     //           readCustomerSubscriptionPlanFromCustomerId(customer.id),
     //           readAllCustomerPayments(customer.id),
     //           readAllActiveSubscriptionPlans(),
     //           getAllLogsFromEmail(customer.email)
     //      ]);

     //      if (customerLogs) {
     //           allLogsFromEmail = customerLogs;
     //      }

     //      if (readSubscriptionPlanFromCustomerIdSuccess && subscriptionPlan) {
     //           customerSubscriptionPlan = subscriptionPlan;
     //      }

     //      if (readCustomerPaymentsSuccess && readCustomerPaymentsData) {
     //           customerInvoices = readCustomerPaymentsData;
     //      }

     //      if (readAllActiveSubscriptionPlansSuccess && activeSubscriptionPlansData) {
     //           allSubscriptions = activeSubscriptionPlansData;
     //      }

     // } else if (tenant) {
     //      redirect('/dashboard/social/profile');
     // }

     // return (
     //      <Account
     //           customer={customer!}
     //           userData={userData!}
     //           customerSubscriptionPlan={customerSubscriptionPlan!}
     //           customerInvoices={customerInvoices}
     //           subscriptionPlans={allSubscriptions!}
     //           customerLogs={allLogsFromEmail! || []}
     //      />
     // )
};

export default Page;
