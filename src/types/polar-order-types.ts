export interface OrderEventBase<TType extends string> {
  type: TType;
  timestamp: string;
  data: PolarOrder;
}

export type OrderEvent =
  | OrderCreatedEvent
  | OrderUpdatedEvent
  | OrderPaidEvent
  | OrderRefundedEvent;

export interface OrderCreatedEvent extends OrderEventBase<"order.created"> { }
export interface OrderUpdatedEvent extends OrderEventBase<"order.updated"> { }
export interface OrderPaidEvent extends OrderEventBase<"order.paid"> { }
export interface OrderRefundedEvent extends OrderEventBase<"order.refunded"> { }

export type PolarOrderStatus = "pending" | "paid" | "refunded" | "partially_refunded";

// Invoice-related helpers built on top of PolarOrder
export type InvoiceStatus = PolarOrderStatus;

export const invoiceStatusTokenMap: Record<InvoiceStatus, string> = {
  pending: 'invoice.status.pending',
  paid: 'invoice.status.paid',
  refunded: 'invoice.status.refunded',
  partially_refunded: 'invoice.status.partially_refunded',
};

export interface PolarOrder {
  id: string;
  created_at: string;
  modified_at: string;
  client_id: string;
  status: PolarOrderStatus;
  paid: boolean;
  subtotal_amount: number;
  discount_amount: number;
  net_amount: number;
  tax_amount: number;
  total_amount: number;
  applied_balance_amount: number;
  due_amount: number;
  refunded_amount: number;
  refunded_tax_amount: number;
  currency: string;
  billing_reason: string;
  billing_name: string;
  billing_address: PolarOrderAddress;
  invoice_number: string;
  is_invoice_generated: boolean;
  customer_id: string;
  product_id: string;
  discount_id: string | null;
  subscription_id: string | null;
  checkout_id: string | null;
  metadata: Record<string, unknown>;
  platform_fee_amount: number;
  customer: PolarOrderCustomer;
  user_id: string | null;
  product: PolarOrderProduct;
  discount: PolarOrderDiscount | null;
  subscription: PolarOrderSubscription | null;
  items: PolarOrderItem[];
  description: string;
  seats: number;
  custom_field_data: Record<string, unknown>;
}

export interface PolarOrderAddress {
  country: string;
  line1: string;
  line2: string;
  postal_code: string;
  city: string;
  state: string;
}

export interface PolarOrderCustomer {
  id: string;
  created_at: string;
  modified_at: string;
  metadata: Record<string, unknown>;
  external_id: string;
  email: string;
  email_verified: boolean;
  name: string;
  billing_address: PolarOrderAddress;
  tax_id: string[];
  organization_id: string;
  deleted_at: string | null;
  avatar_url: string | null;
}

export interface PolarOrderProduct {
  metadata: Record<string, unknown>;
  id: string;
  created_at: string;
  modified_at: string;
  trial_interval: string;
  trial_interval_count: number;
  name: string;
  description: string;
  recurring_interval: string;
  recurring_interval_count: number;
  is_recurring: boolean;
  is_archived: boolean;
  organization_id: string;
}

export interface PolarOrderDiscount {
  duration: string;
  type: string;
  amount: number;
  currency: string;
  created_at: string;
  modified_at: string;
  id: string;
  metadata: Record<string, unknown>;
  name: string;
  code: string;
  starts_at: string;
  ends_at: string;
  max_redemptions: number;
  redemptions_count: number;
  organization_id: string;
}

export interface PolarOrderSubscription {
  metadata: Record<string, unknown>;
  created_at: string;
  modified_at: string;
  id: string;
  amount: number;
  currency: string;
  recurring_interval: string;
  recurring_interval_count: number;
  status: string;
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
  seats: number;
}

export interface PolarOrderItem {
  created_at: string;
  modified_at: string;
  id: string;
  label: string;
  amount: number;
  tax_amount: number;
  proration: boolean;
  product_price_id: string;
}
