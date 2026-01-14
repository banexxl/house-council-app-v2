import * as Yup from 'yup';
import { PolarProduct, PolarProductPrice, PolarProductInterval } from './polar-product-types';

// Re-export Polar types for convenience
export type PolarRecurringInterval = PolarProductInterval;

// Client-specific subscription status options (DB values for client subscriptions)
export type ClientSubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';
export type SubscriptionStatus = ClientSubscriptionStatus; // Alias for compatibility

export const clientSubscriptionStatusOptions: { value: ClientSubscriptionStatus; label: string }[] = [
     { value: 'trialing', label: 'subscriptionPlans.statusTrial' },
     { value: 'active', label: 'subscriptionPlans.statusActive' },
     { value: 'past_due', label: 'subscriptionPlans.statusPastDue' },
     { value: 'canceled', label: 'subscriptionPlans.statusCanceled' }
];

// Use PolarProduct as the main type for subscription plans
export type SubscriptionPlan = PolarProduct;

export const subscriptionPlanInitialValues: PolarProduct = {
     id: '',
     created_at: new Date().toISOString(),
     modified_at: new Date().toISOString(),
     trial_interval: 'day',
     trial_interval_count: 0,
     name: '',
     description: '',
     recurring_interval: 'month',
     recurring_interval_count: 1,
     is_recurring: true,
     is_archived: false,
     organization_id: '',
     metadata: {},
     prices: [],
     benefits: [],
     medias: [],
     attached_custom_fields: []
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const subscriptionPlanValidationSchema = (t: (key: string) => string) => Yup.object({
     name: Yup.string().required(t('subscriptionPlans.validation.required')),
     description: Yup.string(),
     recurring_interval: Yup.string().oneOf(['day', 'week', 'month', 'year']).required(t('subscriptionPlans.validation.required')),
     recurring_interval_count: Yup.number().min(1, t('subscriptionPlans.validation.mustBePositive')).required(t('subscriptionPlans.validation.required')),
     is_recurring: Yup.boolean(),
     is_archived: Yup.boolean(),
     organization_id: Yup.string().matches(uuidRegex, { message: t('subscriptionPlans.validation.uuidInvalid'), excludeEmptyString: true }),
});

export interface ClientSubscription {
     id: string;
     customerId: string | null;
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
