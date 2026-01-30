"use server";

import AccessRequestForm from './request-form';
import { getBuildingById } from 'src/app/actions/building/building-actions';

type AccessRequestSearchParams = {
  buildingId?: string | string[];
};

type AccessRequestPageProps = {
  searchParams?: Promise<AccessRequestSearchParams>;
};

export default async function Page({ searchParams }: AccessRequestPageProps) {

  const params = await searchParams;
  const formSecret =
    (process.env.ACCESS_REQUEST_FORM_SECRET || process.env.NEXT_PUBLIC_ACCESS_REQUEST_FORM_SECRET || '').trim();
  let prefillBuilding:
    | { id: string; label: string; country?: string; city?: string }
    | undefined;

  if (params?.buildingId) {
    const buildingRes = await getBuildingById(params?.buildingId!.toString());
    if (buildingRes.success && buildingRes.data) {
      const location = buildingRes.data.building_location;
      const label = location
        ? [location.street_address, location.street_number, location.city]
          .filter((part) => !!part && part.toString().trim().length > 0)
          .join(' ')
          .trim()
        : '';
      prefillBuilding = {
        id: buildingRes.data.id,
        label: label || buildingRes.data.id,
        country: location?.country?.trim() || undefined,
        city: location?.city?.trim() || undefined,
      };
    }
  }

  return (
    <AccessRequestForm
      formSecret={formSecret}
      prefillBuilding={prefillBuilding}
    />
  );
}
