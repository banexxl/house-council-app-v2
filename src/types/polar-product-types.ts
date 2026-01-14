export type PolarProductEventType =
     | "product.created"
     | "product.updated";

export type PolarProductEvent =
     | PolarProductCreatedEvent
     | PolarProductUpdatedEvent;

export interface PolarProductEventBase<TType extends PolarProductEventType> {
     type: TType;
     timestamp: string;
     data: PolarProduct;
}

export interface PolarProductCreatedEvent extends PolarProductEventBase<"product.created"> { }
export interface PolarProductUpdatedEvent extends PolarProductEventBase<"product.updated"> { }

export type PolarProductInterval = "day" | "week" | "month" | "year";

export interface PolarProduct {
     id: string;
     createdAt: Date | null;
     modifiedAt: Date | null;
     trialInterval: PolarProductInterval | null;
     trialIntervalCount: number | null;
     name: string;
     description: string | null;
     recurringInterval: PolarProductInterval | null;
     recurringIntervalCount: number | null;
     isRecurring: boolean;
     isArchived: boolean;
     organizationId: string;
     metadata: Record<string, unknown>;
     prices: PolarProductPrice[];
     benefits: PolarProductBenefit[];
     medias: PolarProductMedia[];
     attachedCustomFields: PolarProductAttachedCustomField[];
}

export interface PolarProductPrice {
     createdAt: Date | null;
     modifiedAt: Date | null;
     id: string;
     source: string;
     amountType: string;
     isArchived: boolean;
     productId: string;
     type: string;
     recurringInterval: PolarProductInterval | null;
     priceCurrency?: string;
     priceAmount?: number;
     legacy?: boolean;
}

export interface PolarProductBenefit {
     id: string;
     createdAt: Date | null;
     modifiedAt: Date | null;
     type: string;
     description: string;
     selectable: boolean;
     deletable: boolean;
     organizationId: string;
     metadata: Record<string, unknown>;
     properties: Record<string, string>;
}

export interface PolarProductMedia {
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
     lastModifiedAt: Date | null;
     version: string;
     service: string;
     isUploaded: boolean;
     createdAt: Date | null;
     sizeReadable: string;
     publicUrl: string;
}

export interface PolarProductAttachedCustomField {
     customFieldId: string;
     customField: PolarProductCustomField;
     order: number;
     required: boolean;
}

export interface PolarProductCustomField {
     createdAt: Date | null;
     modifiedAt: Date | null;
     id: string;
     metadata: Record<string, unknown>;
     type: string;
     slug: string;
     name: string;
     organizationId: string;
     properties: PolarProductCustomFieldProperties;
}

export interface PolarProductCustomFieldProperties {
     formLabel: string;
     formHelpText: string;
     formPlaceholder: string;
     textarea: boolean;
     minLength: number;
     maxLength: number;
}
