import * as Yup from 'yup';

export type SubscriptionStatus = 'trialing' | 'active' | 'canceled' | 'past_due'; // extend if needed

export type RenewalPeriod = 'monthly' | 'annually'; // extend if needed

export type SubscriptionPlan = {
     id?: string;
     created_at: Date;
     updated_at: Date;
     name: string;
     description: string;
     status_id: string;
     is_billed_annually: boolean;
     annual_discount_percentage: number;
     is_discounted: boolean;
     discount_percentage: number;
     features?: string[];
     base_price: number;
     monthly_total_price: number;
     total_price_with_discounts: number;
     max_number_of_apartments: number;
};

export const subscriptionPlanInitialValues: SubscriptionPlan = {
     created_at: new Date(),
     updated_at: new Date(),
     name: '',
     description: '',
     status_id: '',
     is_billed_annually: false,
     annual_discount_percentage: 0,
     is_discounted: false,
     discount_percentage: 0,
     features: [],
     base_price: 0,
     monthly_total_price: 0,
     total_price_with_discounts: 0,
     max_number_of_apartments: 1
};

export const subscriptionPlanValidationSchema = Yup.object({
     name: Yup.string().required("Required"),
     description: Yup.string(),
     status_id: Yup.string().required("Required"),
     is_billed_annually: Yup.boolean(),
     annual_discount_percentage: Yup.number().min(0, "Must be positive").max(100, "Must be 100 or less"),
     is_discounted: Yup.boolean(),
     discount_percentage: Yup.number().min(0, "Must be positive").max(100, "Must be 100 or less"),
     base_price: Yup.number().min(0, "Must be positive").max(1000000, "Must be 1,000,000 or less"),
     monthly_total_price: Yup.number().min(0, "Must be positive").max(1000000, "Must be 1,000,000 or less"),
     total_price_with_discounts: Yup.number().min(0, "Must be positive").max(1000000, "Must be 1,000,000 or less"),
     max_number_of_apartments: Yup.number().min(0, "Must be positive").required("Required")
})

export interface ClientSubscription {
     id: string;
     client_id: string;
     subscription_plan_id: string;
     status: SubscriptionStatus;
     created_at: string; // ISO date string
     updated_at: string; // ISO date string
     is_auto_renew: boolean;
     next_payment_date: string | null; // nullable
     renewal_period: RenewalPeriod
}
