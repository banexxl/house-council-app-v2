import * as Yup from 'yup';

export type SubscriptionPlan = {
     id?: string;
     created_at: Date;
     updated_at: Date;
     name: string;
     description: string;
     status_id: string;
     is_billed_yearly: boolean;
     yearly_discount_percentage: number;
     is_discounted: boolean;
     discount_percentage: number;
     features?: string[];
     base_price: number;
     total_price: number;
};

export const subscriptionPlanInitialValues: SubscriptionPlan = {
     created_at: new Date(),
     updated_at: new Date(),
     name: '',
     description: '',
     status_id: '',
     is_billed_yearly: false,
     yearly_discount_percentage: 0,
     is_discounted: false,
     discount_percentage: 0,
     features: [],
     base_price: 0,
     total_price: 0
};

export const subscriptionPlanValidationSchema = Yup.object({
     name: Yup.string().required("Required"),
     description: Yup.string(),
     status_id: Yup.string().required("Required"),
     is_billed_yearly: Yup.boolean(),
     yearly_discount_percentage: Yup.number().min(0, "Must be positive").max(100, "Must be 100 or less"),
     is_discounted: Yup.boolean(),
     discount_percentage: Yup.number().min(0, "Must be positive").max(100, "Must be 100 or less"),
     base_price: Yup.number().min(0, "Must be positive").max(1000000, "Must be 1,000,000 or less"),
     total_price: Yup.number().min(0, "Must be positive").max(1000000, "Must be 1,000,000 or less")
})
