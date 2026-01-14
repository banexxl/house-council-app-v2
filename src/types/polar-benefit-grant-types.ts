export type PolarBenefitGrantEventType =
     | "benefit_grant.created"
     | "benefit_grant.cycled"
     | "benefit_grant.updated"
     | "benefit_grant.revoked";

export type PolarBenefitGrantEvent =
     | PolarBenefitGrantCreatedEvent
     | PolarBenefitGrantCycledEvent
     | PolarBenefitGrantUpdatedEvent
     | PolarBenefitGrantRevokedEvent;

export interface PolarBenefitGrantEventBase<TType extends PolarBenefitGrantEventType> {
     type: TType;
     timestamp: string;
     data: PolarBenefitGrant;
}

export interface PolarBenefitGrantCreatedEvent extends PolarBenefitGrantEventBase<"benefit_grant.created"> { }
export interface PolarBenefitGrantCycledEvent extends PolarBenefitGrantEventBase<"benefit_grant.cycled"> { }
export interface PolarBenefitGrantUpdatedEvent extends PolarBenefitGrantEventBase<"benefit_grant.updated"> { }
export interface PolarBenefitGrantRevokedEvent extends PolarBenefitGrantEventBase<"benefit_grant.revoked"> { }

export interface PolarBenefitGrant {
     id: string;
     createdAt: string;
     modifiedAt: string;
     isGranted: boolean;
     isRevoked: boolean;
     subscriptionId: string;
     orderId: string;
     customerId: string;
     benefitId: string;
     customer: PolarBenefitGrantCustomer;
     benefit: PolarBenefitGrantBenefit;
     properties: PolarBenefitGrantProperties;
     previousProperties: PolarBenefitGrantProperties | null;
     grantedAt: string | null;
     revokedAt: string | null;
     error: PolarBenefitGrantError | null;
}

export interface PolarBenefitGrantCustomer {
     id: string;
     createdAt: string;
     modifiedAt: string;
     metadata: Record<string, unknown>;
     email: string;
     emailVerified: boolean;
     name: string;
     billingAddress: PolarBenefitGrantCustomerAddress;
     taxId: string[];
     organizationId: string;
     deletedAt: string | null;
     avatarUrl: string | null;
}

export interface PolarBenefitGrantCustomerAddress {
     country: string;
     line1: string;
     line2: string;
     postalCode: string;
     city: string;
     state: string;
}

export interface PolarBenefitGrantBenefit {
     id: string;
     createdAt: string;
     modifiedAt: string;
     type: string;
     description: string;
     selectable: boolean;
     deletable: boolean;
     organizationId: string;
     metadata: Record<string, unknown>;
     properties: PolarBenefitGrantBenefitProperties;
}

export interface PolarBenefitGrantBenefitProperties {
     guildId?: string;
     roleId?: string;
     kickMember?: boolean;
     guildToken?: string;
     [key: string]: unknown;
}

export interface PolarBenefitGrantProperties {
     accountId?: string;
     guildId?: string;
     roleId?: string;
     grantedAccountId?: string;
     [key: string]: unknown;
}

export interface PolarBenefitGrantError {
     message: string;
     type: string;
     timestamp: string;
}
