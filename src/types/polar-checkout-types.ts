export interface CheckoutCreated {
     type: "checkout.created";
     timestamp: string;
     data: CheckoutData;
}

export interface CheckoutUpdated {
     type: "checkout.updated";
     timestamp: string;
     data: CheckoutData;
}

export interface CustomerSeatAssigned {
     type: "customer_seat.assigned";
     timestamp: string;
     data: CustomerSeatAssignment;
}

export interface CustomerSeatClaimed {
     type: "customer_seat.claimed";
     timestamp: string;
     data: CustomerSeatAssignment;
}

export interface CustomerSeatRevoked {
     type: "customer_seat.revoked";
     timestamp: string;
     data: CustomerSeatAssignment;
}

export interface CustomerSeatAssignment {
     createdAt: string;
     modifiedAt: string;
     id: string;
     status: string;
     subscriptionId: string;
     orderId: string;
     customerId: string;
     customerEmail: string;
     invitationTokenExpiresAt: string | null;
     claimedAt: string | null;
     revokedAt: string | null;
     seatMetadata: Record<string, unknown>;
}

export interface CheckoutData {
     id: string;
     createdAt: string;
     modifiedAt: string;
     paymentProcessor: string;
     status: string;
     clientSecret: string;
     url: string;
     expiresAt: string;
     successUrl: string;
     returnUrl: string;
     embedOrigin: string;
     amount: number;
     discountAmount: number;
     netAmount: number;
     taxAmount: number;
     totalAmount: number;
     currency: string;
     allowTrial: boolean;
     activeTrialInterval: string;
     activeTrialIntervalCount: number;
     trialEnd: string;
     organizationId: string;
     productId: string;
     productPriceId: string;
     discountId: string;
     allowDiscountCodes: boolean;
     requireBillingAddress: boolean;
     isDiscountApplicable: boolean;
     isFreeProductPrice: boolean;
     isPaymentRequired: boolean;
     isPaymentSetupRequired: boolean;
     isPaymentFormRequired: boolean;
     customerId: string;
     isBusinessCustomer: boolean;
     customerName: string;
     customerEmail: string;
     customerIpAddress: string;
     customerBillingName: string;
     customerBillingAddress: CustomerBillingAddress;
     customerTaxId: string;
     paymentProcessorMetadata: Record<string, unknown>;
     billingAddressFields: BillingAddressFields;
     trialInterval: string;
     trialIntervalCount: number;
     metadata: Record<string, unknown>;
     externalCustomerId: string;
     customerExternalId: string;
     products: CheckoutProduct[];
     product: CheckoutProduct;
     productPrice: CheckoutPrice;
     prices: Record<string, unknown>;
     discount: CheckoutDiscount;
     subscriptionId: string;
     attachedCustomFields: CheckoutAttachedCustomField[];
     customerMetadata: Record<string, unknown>;
     customFieldData: Record<string, unknown>;
     seats: number;
     pricePerSeat: number;
}

export interface CustomerBillingAddress {
     country: string;
     line1: string;
     line2: string;
     postalCode: string;
     city: string;
     state: string;
}

export interface BillingAddressFields {
     country: string;
     state: string;
     city: string;
     postalCode: string;
     line1: string;
     line2: string;
}

export interface CheckoutProduct {
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
     prices: CheckoutPrice[];
     benefits: CheckoutBenefit[];
     medias: CheckoutMedia[];
}

export interface CheckoutPrice {
     createdAt: string;
     modifiedAt: string;
     id: string;
     source: string;
     amountType: string;
     isArchived: boolean;
     productId: string;
     type: string;
     recurringInterval: string;
     priceCurrency: string;
     priceAmount: number;
     legacy: boolean;
}

export interface CheckoutBenefit {
     id: string;
     createdAt: string;
     modifiedAt: string;
     type: string;
     description: string;
     selectable: boolean;
     deletable: boolean;
     organizationId: string;
}

export interface CheckoutMedia {
     id: string;
     organizationId: string;
     name: string;
     path: string;
     mimeType: string;
     size: number;
     storageVersion: string;
     checksumEtag: string;
     checksumSha256Base64: string;
     checksumSha256Hex: string;
     lastModifiedAt: string;
     version: string;
     service: string;
     isUploaded: boolean;
     createdAt: string;
     sizeReadable: string;
     publicUrl: string;
}

export interface CheckoutDiscount {
     duration: string;
     type: string;
     amount: number;
     currency: string;
     id: string;
     name: string;
     code: string;
}

export interface CheckoutAttachedCustomField {
     customFieldId: string;
     customField: CheckoutCustomField;
     order: number;
     required: boolean;
}

export interface CheckoutCustomField {
     createdAt: string;
     modifiedAt: string;
     id: string;
     metadata: Record<string, unknown>;
     type: string;
     slug: string;
     name: string;
     organizationId: string;
     properties: CheckoutCustomFieldProperties;
}

export interface CheckoutCustomFieldProperties {
     formLabel: string;
     formHelpText: string;
     formPlaceholder: string;
     textarea: boolean;
     minLength: number;
     maxLength: number;
}
