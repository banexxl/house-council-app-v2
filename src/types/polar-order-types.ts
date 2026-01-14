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

export interface PolarOrder {
     id: string;
     createdAt: string;
     modifiedAt: string;
     status: PolarOrderStatus;
     paid: boolean;
     subtotalAmount: number;
     discountAmount: number;
     netAmount: number;
     taxAmount: number;
     totalAmount: number;
     appliedBalanceAmount: number;
     dueAmount: number;
     refundedAmount: number;
     refundedTaxAmount: number;
     currency: string;
     billingReason: string;
     billingName: string;
     billingAddress: PolarOrderAddress;
     invoiceNumber: string;
     isInvoiceGenerated: boolean;
     customerId: string;
     productId: string;
     discountId: string | null;
     subscriptionId: string | null;
     checkoutId: string | null;
     metadata: Record<string, unknown>;
     platformFeeAmount: number;
     customer: PolarOrderCustomer;
     userId: string | null;
     product: PolarOrderProduct;
     discount: PolarOrderDiscount | null;
     subscription: PolarOrderSubscription | null;
     items: PolarOrderItem[];
     description: string;
     seats: number;
     customFieldData: Record<string, unknown>;
}

export interface PolarOrderAddress {
     country: string;
     line1: string;
     line2: string;
     postalCode: string;
     city: string;
     state: string;
}

export interface PolarOrderCustomer {
     id: string;
     createdAt: string;
     modifiedAt: string;
     metadata: Record<string, unknown>;
     email: string;
     emailVerified: boolean;
     name: string;
     billingAddress: PolarOrderAddress;
     taxId: string[];
     organizationId: string;
     deletedAt: string | null;
     avatarUrl: string | null;
}

export interface PolarOrderProduct {
     metadata: Record<string, unknown>;
     id: string;
     createdAt: string;
     modifiedAt: string;
     trialInterval: string;
     trialIntervalCount: number;
     name: string;
     description: string;
     recurringInterval: string;
     recurringIntervalCount: number;
     isRecurring: boolean;
     isArchived: boolean;
     organizationId: string;
}

export interface PolarOrderDiscount {
     duration: string;
     type: string;
     amount: number;
     currency: string;
     createdAt: string;
     modifiedAt: string;
     id: string;
     metadata: Record<string, unknown>;
     name: string;
     code: string;
     startsAt: string;
     endsAt: string;
     maxRedemptions: number;
     redemptionsCount: number;
     organizationId: string;
}

export interface PolarOrderSubscription {
     metadata: Record<string, unknown>;
     createdAt: string;
     modifiedAt: string;
     id: string;
     amount: number;
     currency: string;
     recurringInterval: string;
     recurringIntervalCount: number;
     status: string;
     currentPeriodStart: string;
     currentPeriodEnd: string;
     trialStart: string | null;
     trialEnd: string | null;
     cancelAtPeriodEnd: boolean;
     canceledAt: string | null;
     startedAt: string;
     endsAt: string | null;
     endedAt: string | null;
     customerId: string;
     productId: string;
     discountId: string | null;
     checkoutId: string | null;
     customerCancellationReason: string | null;
     customerCancellationComment: string | null;
     seats: number;
}

export interface PolarOrderItem {
     createdAt: string;
     modifiedAt: string;
     id: string;
     label: string;
     amount: number;
     taxAmount: number;
     proration: boolean;
     productPriceId: string;
}
