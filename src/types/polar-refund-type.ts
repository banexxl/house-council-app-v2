export type PolarRefundEventType =
     | "refund.created"
     | "refund.updated";

export type PolarRefundEvent =
     | PolarRefundCreatedEvent
     | PolarRefundUpdatedEvent;

export interface PolarRefundEventBase<TType extends PolarRefundEventType> {
     type: TType;
     timestamp: string;
     data: PolarRefund;
}

export interface PolarRefundCreatedEvent extends PolarRefundEventBase<"refund.created"> { }
export interface PolarRefundUpdatedEvent extends PolarRefundEventBase<"refund.updated"> { }

export interface PolarRefund {
     id: string;
     createdAt: string;
     modifiedAt: string;
     metadata: Record<string, unknown>;
     status: "pending" | "succeeded" | "failed" | "canceled";
     reason: string;
     amount: number;
     taxAmount: number;
     currency: string;
     organizationId: string;
     orderId: string;
     subscriptionId: string;
     customerId: string;
     revokeBenefits: boolean;
}
