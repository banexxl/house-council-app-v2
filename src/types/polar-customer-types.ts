export type PolarCustomerEventType =
     | "customer.created"
     | "customer.updated"
     | "customer.deleted"
     | "customer.state_changed"
     | "customer_seat.assigned"
     | "customer_seat.claimed"
     | "customer_seat.revoked";

export interface PolarCustomerEvent {
     type: "customer.created";
     timestamp: string;
     data: PolarCustomer;
}

export interface PolarCustomerUpdatedEvent {
     type: "customer.updated";
     timestamp: string;
     data: PolarCustomer;
}

export interface PolarCustomerDeletedEvent {
     type: "customer.deleted";
     timestamp: string;
     data: PolarCustomer;
}

export interface PolarCustomerStateChangedEvent {
     type: "customer.state_changed";
     timestamp: string;
     data: PolarCustomerState;
}

export type PolarCustomerSeatEventType =
     | "customer_seat.assigned"
     | "customer_seat.claimed"
     | "customer_seat.revoked";

export interface PolarCustomerSeatEvent<T extends PolarCustomerSeatEventType = PolarCustomerSeatEventType> {
     type: T;
     timestamp: string;
     data: Record<string, unknown>;
}

export interface PolarCustomerState extends PolarCustomer {
     activeSubscriptions: PolarCustomerSubscription[];
     grantedBenefits: PolarGrantedBenefit[];
     activeMeters: PolarActiveMeter[];
}

export interface PolarCustomerSubscription {
     id: string;
     createdAt: Date;
     modifiedAt: Date;
     metadata: Record<string, unknown>;
     status: string;
     amount: number;
     currency: string;
     recurringInterval: string;
     currentPeriodStart: string;
     currentPeriodEnd: string;
     trialStart: string | null;
     trialEnd: string | null;
     cancelAtPeriodEnd: boolean;
     canceledAt: string | null;
     startedAt: string;
     endsAt: string | null;
     productId: string;
     discountId: string | null;
     meters: PolarCustomerMeter[];
     customFieldData: Record<string, unknown>;
}

export interface PolarCustomerMeter {
     createdAt: Date;
     modifiedAt: Date;
     id: string;
     consumedUnits: number;
     creditedUnits: number;
     amount: number;
     meterId: string;
}

export interface PolarGrantedBenefit {
     id: string;
     createdAt: string;
     modifiedAt: string;
     grantedAt: string;
     benefitId: string;
     benefitType: string;
     benefitMetadata: Record<string, unknown>;
     properties: Record<string, string>;
}

export interface PolarActiveMeter {
     id: string;
     createdAt: string;
     modifiedAt: string;
     meterId: string;
     consumedUnits: number;
     creditedUnits: number;
     balance: number;
}

export interface PolarCustomer {
     id: string;
     customerId?: string
     externalId: string | null;
     createdAt: Date | null;
     modifiedAt: Date | null;
     metadata: Record<string, unknown>;
     email: string;
     emailVerified: boolean;
     name: string | null;
     billingAddress: PolarCustomerAddress | null;
     taxId: (string | null)[] | null;
     organizationId: string;
     deletedAt: Date | null;
     avatarUrl: string | null;
}

export interface PolarCustomerAddress {
     country: string | null;
     line1?: string | null;
     line2?: string | null;
     postalCode?: string | null;
     city?: string | null;
     state?: string | null;
}
