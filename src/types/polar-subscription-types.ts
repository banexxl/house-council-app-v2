import { PolarActiveMeter } from "./polar-customer-types";
import { PolarOrderDiscount } from "./polar-order-types";
import { PolarProduct, PolarProductPrice } from "./polar-product-types";

export type PolarSubscriptionEventType =
     | "subscription.created"
     | "subscription.updated"
     | "subscription.active"
     | "subscription.canceled"
     | "subscription.uncanceled"
     | "subscription.revoked"
     | "subscription.past_due";

export type PolarSubscriptionEvent =
     | PolarSubscriptionCreatedEvent
     | PolarSubscriptionUpdatedEvent
     | PolarSubscriptionActiveEvent
     | PolarSubscriptionCanceledEvent
     | PolarSubscriptionUncanceledEvent
     | PolarSubscriptionRevokedEvent
     | PolarSubscriptionPastDueEvent;

export interface PolarSubscriptionEventBase<TType extends PolarSubscriptionEventType> {
     type: TType;
     timestamp: string;
     subscriptionId: string;
}
export interface PolarSubscriptionCreatedEvent extends PolarSubscriptionEventBase<"subscription.created"> { }
export interface PolarSubscriptionUpdatedEvent extends PolarSubscriptionEventBase<"subscription.updated"> { }
export interface PolarSubscriptionActiveEvent extends PolarSubscriptionEventBase<"subscription.active"> { }
export interface PolarSubscriptionCanceledEvent extends PolarSubscriptionEventBase<"subscription.canceled"> { }
export interface PolarSubscriptionUncanceledEvent extends PolarSubscriptionEventBase<"subscription.uncanceled"> { }
export interface PolarSubscriptionRevokedEvent extends PolarSubscriptionEventBase<"subscription.revoked"> { }
export interface PolarSubscriptionPastDueEvent extends PolarSubscriptionEventBase<"subscription.past_due"> { }

export type PolarRecurringInterval = "day" | "week" | "month" | "year";

export interface PolarSubscription {
     id: string;
     orderId?: string | null;
     createdAt: Date | null;
     modifiedAt: Date | null;
     metadata: object;
     amount: number;
     currency: string;
     recurringInterval: PolarRecurringInterval;
     recurringIntervalCount: number;
     status: PolarSubscriptionStatus;
     currentPeriodStart: Date | null;
     currentPeriodEnd: Date | null;
     trialStart: Date | null;
     trialEnd: Date | null;
     cancelAtPeriodEnd: boolean;
     canceledAt: Date | null;
     startedAt: Date | null;
     endsAt: Date | null;
     endedAt: Date | null;
     customerId: string;
     productId: string;
     product: PolarProduct
     discountId: string | null;
     discount: PolarOrderDiscount | null;
     checkoutId: string | null;
     customerCancellationReason: string | null;
     customerCancellationComment: string | null;
     prices: PolarProductPrice[];
     meters: PolarActiveMeter[];
     seats: number;
     customFieldData: Record<string, unknown>;
     subscriptionId?: string
}

export type PolarSubscriptionStatus =
     | "incomplete"
     | "incomplete_expired"
     | "trialing"
     | "active"
     | "past_due"
     | "canceled"
     | "unpaid";

