'use server';

import { redirect } from "next/navigation";
import { readAllEntities } from "src/app/actions/base-entity-actions";
import { getViewer } from "src/libs/supabase/server-auth";
import { TABLES } from "src/libs/supabase/tables";
import { BaseEntity, FeatureExtension } from "src/types/base-entity";
import Features from "./features";

export default async function FeaturesPage() {

     const { customer, tenant, admin } = await getViewer();
     if (!customer && !tenant && !admin) {
          redirect('/auth/login');
     }

     const features = await readAllEntities<BaseEntity & FeatureExtension>(TABLES.FEATURES);

     return (
          <Features features={features} />
     );
}
