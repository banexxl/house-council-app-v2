"use server";

import AccessRequestForm from './request-form';
import { getAccessRequestBuildingOptions } from 'src/app/actions/access-request/access-request-actions';

export default async function AccessRequestPage() {
  const formSecret =
    (process.env.ACCESS_REQUEST_FORM_SECRET || process.env.NEXT_PUBLIC_ACCESS_REQUEST_FORM_SECRET || '').trim();
  const buildingsRes = await getAccessRequestBuildingOptions();
  return (
    <AccessRequestForm
      formSecret={formSecret}
      buildingOptions={buildingsRes.data || []}
      countries={buildingsRes.countries || []}
    />
  );
}
