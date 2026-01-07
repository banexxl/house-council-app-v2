import * as Yup from 'yup';

export type SubscriptionStatus = 'promo' | 'inactive' | 'archived' | 'scheduled' | 'trial' | 'active';

export const subscriptionPlanStatusOptions: { value: SubscriptionStatus, label: string }[] = [
     { value: 'promo', label: 'subscriptionPlans.statusPromo' },
     { value: 'inactive', label: 'subscriptionPlans.statusInactive' },
     { value: 'archived', label: 'subscriptionPlans.statusArchived' },
     { value: 'scheduled', label: 'subscriptionPlans.statusScheduled' },
     { value: 'trial', label: 'subscriptionPlans.statusTrial' },
     { value: 'active', label: 'subscriptionPlans.statusActive' }
]

// Client-specific subscription status options (DB values for client subscriptions)
export type ClientSubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export const clientSubscriptionStatusOptions: { value: ClientSubscriptionStatus; label: string }[] = [
     { value: 'trialing', label: 'subscriptionPlans.statusTrial' },
     { value: 'active', label: 'subscriptionPlans.statusActive' },
     { value: 'past_due', label: 'subscriptionPlans.statusPastDue' },
     { value: 'canceled', label: 'subscriptionPlans.statusCanceled' }
];

export type SubscriptionPlan = {
     id: string;
     created_at: Date;
     updated_at: Date;
     name: string;
     description: string;
     status: string;
     is_billed_annually: boolean;
     annual_discount_percentage: number;
     is_discounted: boolean;
     discount_percentage: number;
     features?: string[];
     base_price: number;
     monthly_total_price_per_apartment: number;
     total_price_per_apartment_with_discounts: number;
     max_number_of_apartments: number;
     max_number_of_team_members: number;
     polar_product_id_monthly?: string | null;
     polar_product_id_annually?: string | null;
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const subscriptionPlanInitialValues: SubscriptionPlan = {
     id: '',
     created_at: new Date(),
     updated_at: new Date(),
     name: '',
     description: '',
     status: '',
     is_billed_annually: false,
     annual_discount_percentage: 0,
     is_discounted: false,
     discount_percentage: 0,
     features: [],
     base_price: 0,
     monthly_total_price_per_apartment: 0,
     total_price_per_apartment_with_discounts: 0,
     max_number_of_apartments: 1,
     max_number_of_team_members: 0,
     polar_product_id_monthly: null,
     polar_product_id_annually: null
};

export const polarProductIdSchema = (t: (key: string) => string) =>
     Yup.string()
          .nullable()
          .transform((value) => (value === '' ? null : value))
          .matches(uuidRegex, { message: t('subscriptionPlans.validation.uuidInvalid'), excludeEmptyString: true })
          .test(
               "at-least-one-polar-product-id",
               t('subscriptionPlans.validation.atLeastOnePolarProductId'),
               function () {
                    const { polar_product_id_monthly, polar_product_id_annually } = this.parent as SubscriptionPlan;
                    return Boolean(polar_product_id_monthly || polar_product_id_annually);
               }
          );

export const subscriptionPlanValidationSchema = (t: (key: string) => string) => Yup.object({
     name: Yup.string().required(t('subscriptionPlans.validation.required')),
     description: Yup.string(),
     status: Yup.string().required(t('subscriptionPlans.validation.required')),
     is_billed_annually: Yup.boolean(),
     annual_discount_percentage: Yup.number().min(0, t('subscriptionPlans.validation.mustBePositive')).max(100, t('subscriptionPlans.validation.maxHundred')),
     is_discounted: Yup.boolean(),
     discount_percentage: Yup.number().min(0, t('subscriptionPlans.validation.mustBePositive')).max(100, t('subscriptionPlans.validation.maxHundred')),
     base_price: Yup.number().min(0, t('subscriptionPlans.validation.mustBePositive')).max(1000000, t('subscriptionPlans.validation.maxMillion')),
     monthly_total_price_per_apartment: Yup.number().min(0, t('subscriptionPlans.validation.mustBePositive')).max(1000000, t('subscriptionPlans.validation.maxMillion')),
     total_price_per_apartment_with_discounts: Yup.number().min(0, t('subscriptionPlans.validation.mustBePositive')).max(1000000, t('subscriptionPlans.validation.maxMillion')),
     max_number_of_apartments: Yup.number().min(0, t('subscriptionPlans.validation.mustBePositive')).required(t('subscriptionPlans.validation.required')),
     max_number_of_team_members: Yup.number().min(0, t('subscriptionPlans.validation.mustBePositive')).required(t('subscriptionPlans.validation.required')),
     polar_product_id_monthly: polarProductIdSchema(t),
     polar_product_id_annually: polarProductIdSchema(t),
});

export type PolarRecurringInterval = "day" | "week" | "month" | "year";

export interface ClientSubscription {
     id: string;
     client_id: string | null;
     subscription_id: string;
     polar_subscription_id: string;
     order_id?: string | null;
     created_at: string;
     updated_at: string;
     apartment_count: number;
     metadata: Record<string, unknown>;
     amount: number;
     currency: string;
     recurring_interval: PolarRecurringInterval;
     recurring_interval_count: number;
     status: SubscriptionStatus;
     current_period_start: string;
     current_period_end: string;
     trial_start: string | null;
     trial_end: string | null;
     cancel_at_period_end: boolean;
     canceled_at: string | null;
     started_at: string;
     ends_at: string | null;
     ended_at: string | null;
     customer_id: string;
     product_id: string;
     discount_id: string | null;
     checkout_id: string | null;
     customer_cancellation_reason: string | null;
     customer_cancellation_comment: string | null;
     prices: string[];
     meters: string[];
     seats: number;
     custom_field_data: Record<string, unknown>;
}
