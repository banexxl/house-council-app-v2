export type PolarBenefitEventType =
     | "benefit.created"
     | "benefit.updated";

export type PolarBenefitEvent =
     | PolarBenefitCreatedEvent
     | PolarBenefitUpdatedEvent;

export interface PolarBenefitEventBase<TType extends PolarBenefitEventType> {
     type: TType;
     timestamp: string;
     data: PolarBenefit;
}

export interface PolarBenefitCreatedEvent extends PolarBenefitEventBase<"benefit.created"> { }
export interface PolarBenefitUpdatedEvent extends PolarBenefitEventBase<"benefit.updated"> { }

export interface PolarBenefit {
     id: string;
     createdAt: string;
     modifiedAt: string;
     type: "custom";
     description: string;
     selectable: boolean;
     deletable: boolean;
     organizationId: string;
     metadata: Record<string, unknown>;
     properties: Record<string, string>;
}
