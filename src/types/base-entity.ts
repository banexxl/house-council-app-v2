export interface BaseEntity {
     id?: string;
     created_at?: string;
     updated_at?: string;
     name: string;
     description?: string;
}

export type FeatureExtension = {
     price_per_month: number
     slug: string
}

export type Feature = BaseEntity & FeatureExtension;