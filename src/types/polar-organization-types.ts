export type PolarOrganizationEventType = "organization.updated";

export interface PolarOrganizationEvent {
     type: "organization.updated";
     timestamp: string;
     data: PolarOrganization;
}

export interface PolarOrganization {
     id: string;
     createdAt: string;
     modifiedAt: string;
     name: string;
     slug: string;
     avatarUrl: string;
     prorationBehavior: "invoice" | "none";
     allowCustomerUpdates: boolean;
     email: string;
     website: string;
     socials: PolarOrganizationSocial[];
     status: string;
     detailsSubmittedAt: string | null;
     featureSettings: PolarOrganizationFeatureSettings;
     subscriptionSettings: PolarOrganizationSubscriptionSettings;
     notificationSettings: PolarOrganizationNotificationSettings;
     customerEmailSettings: PolarOrganizationCustomerEmailSettings;
}

export interface PolarOrganizationSocial {
     platform: string;
     url: string;
}

export interface PolarOrganizationFeatureSettings {
     issueFundingEnabled: boolean;
     seatBasedPricingEnabled: boolean;
     revopsEnabled: boolean;
     walletsEnabled: boolean;
}

export interface PolarOrganizationSubscriptionSettings {
     allowMultipleSubscriptions: boolean;
     allowCustomerUpdates: boolean;
     prorationBehavior: "invoice" | "none";
     benefitRevocationGracePeriod: number;
     preventTrialAbuse: boolean;
}

export interface PolarOrganizationNotificationSettings {
     newOrder: boolean;
     newSubscription: boolean;
}

export interface PolarOrganizationCustomerEmailSettings {
     orderConfirmation: boolean;
     subscriptionCancellation: boolean;
     subscriptionConfirmation: boolean;
     subscriptionCycled: boolean;
     subscriptionPastDue: boolean;
     subscriptionRevoked: boolean;
     subscriptionUncanceled: boolean;
     subscriptionUpdated: boolean;
}
