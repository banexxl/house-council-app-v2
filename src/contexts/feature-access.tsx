'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Feature } from 'src/types/base-entity';
import { isFeatureAllowed } from 'src/config/feature-access';

type FeatureAccessValue = {
     features: Feature[];
     slugs: string[];
     provided: boolean;
     hasFeature: (slug?: string | null) => boolean;
};

const FeatureAccessContext = createContext<FeatureAccessValue | undefined>(undefined);

interface FeatureAccessProviderProps {
     children: ReactNode;
     features?: Feature[] | null;
     featureSlugs?: string[] | null;
}

export const FeatureAccessProvider = ({ children, features, featureSlugs }: FeatureAccessProviderProps) => {
     const provided = featureSlugs !== undefined && featureSlugs !== null
          ? true
          : Array.isArray(features);

     const normalizedSlugs = useMemo(() => {
          const base = featureSlugs ?? features?.map((f) => f.slug).filter(Boolean) ?? [];
          return base.map((s) => s.toLowerCase());
     }, [featureSlugs, features]);

     const featureSet = useMemo(() => new Set(normalizedSlugs), [normalizedSlugs]);

     const value: FeatureAccessValue = useMemo(() => ({
          features: features ?? [],
          slugs: normalizedSlugs,
          provided,
          hasFeature: (slug?: string | null) => {
               if (!slug) return true;
               if (!provided) return true; // no gating data -> allow
               return isFeatureAllowed(slug, featureSet);
          }
     }), [features, normalizedSlugs, featureSet, provided]);

     return (
          <FeatureAccessContext.Provider value={value}>
               {children}
          </FeatureAccessContext.Provider>
     );
};

export const useFeatureAccess = (): FeatureAccessValue => {
     const ctx = useContext(FeatureAccessContext);
     if (!ctx) {
          return {
               features: [],
               slugs: [],
               provided: false,
               hasFeature: () => true,
          };
     }
     return ctx;
};
