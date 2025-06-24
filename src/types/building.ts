import { BuildingLocation } from "./location";
import * as Yup from 'yup';

export interface Building {
     id?: string;
     created_at: Date
     updated_at: Date
     is_recently_built: boolean;
     description: string;
     has_parking_lot: boolean;
     has_gas_heating: boolean;
     has_central_heating: boolean;
     has_electric_heating: boolean;
     has_solar_power: boolean;
     has_bicycle_room: boolean;
     has_pre_heated_water: boolean;
     has_elevator: boolean;
     stories_high: number;
     building_location: BuildingLocation | null;
     building_status: string;
     number_of_apartments: number;
     client_id: string;
     building_images?: {
          image_url: string;
          is_cover_image: boolean;
     }[];
     max_apartments_per_floor: number;
     has_ground_floor_apartments: boolean;
}

export interface BuildingOptions {
     name: string; // lowercase with underscores
     resource_string: string; // i18n label key
}

export const statusMap: Record<string, string> = {
     vacant: 'buildings.lblBuildingStatusVacant',
     partially_leased: 'buildings.lblBuildingStatusPartiallyLeased',
     renovation: 'buildings.lblBuildingStatusRenovation',
     under_construction: 'buildings.lblBuildingStatusUnderConstruction',
     active: 'buildings.lblBuildingStatusActive',
     temporary: 'buildings.lblBuildingStatusTemporary',
     historical: 'buildings.lblBuildingStatusHistorical',
     condemned: 'buildings.lblBuildingStatusCondemned',
     for_sale: 'buildings.lblBuildingStatusForSale',
     leased: 'buildings.lblBuildingStatusLeased',
     planned: 'buildings.lblBuildingStatusPlanned',
     demolished: 'buildings.lblBuildingStatusDemolished',
     restricted_access: 'buildings.lblBuildingStatusRestrictedAccess',
     inactive: 'buildings.lblBuildingStatusInactive',
     under_inspection: 'buildings.lblBuildingStatusUnderInspection',
};

export const buildingInitialValues: Building = {
     id: undefined,
     is_recently_built: false,
     description: '',
     has_parking_lot: false,
     has_gas_heating: false,
     has_central_heating: false,
     has_electric_heating: false,
     has_solar_power: false,
     has_bicycle_room: false,
     has_pre_heated_water: false,
     has_elevator: false,
     stories_high: 1,
     number_of_apartments: 1,
     client_id: '',
     building_images: [],
     building_status: 'active',
     created_at: new Date(),
     updated_at: new Date(),
     building_location: null,
     max_apartments_per_floor: 1,
     has_ground_floor_apartments: false
};

export const buildingValidationSchema = (t: (key: string) => string) => Yup.object({
     building_location: Yup.object({
          street_address: Yup.string().required(t('buildings.yupBuildingLocationRequired')),
          city: Yup.string().required(t('buildings.yupBuildingLocationRequired')),
          country: Yup.string().required(t('buildings.yupBuildingLocationRequired')),
          street_number: Yup.string().required(t('buildings.yupBuildingLocationRequired')),
          post_code: Yup.number().required(t('buildings.yupBuildingLocationRequired')),
          latitude: Yup.number().required(t('buildings.yupBuildingLocationRequired')),
          longitude: Yup.number().required(t('buildings.yupBuildingLocationRequired'))
     }),
     description: Yup.string().max(5000).required(t('buildings.yupBuildingDescriptionRequired')),
     stories_high: Yup.number().min(1).required(t('buildings.yupBuildingStoriesHighRequired')),
     building_status: Yup.string().required(t('buildings.yupBuildingStatusRequired')),
     building_images: Yup.array(),
     number_of_apartments: Yup.number()
          .required(t('buildings.yupBuildingNumberOfApartmentsRequired'))
          .min(1, t('buildings.yupBuildingNumberOfApartmentsRequired'))
          .test(
               'max-apartments-check',
               t('buildings.yupBuildingNumberOfApartmentsMaxCheck'),
               function (value) {
                    const { stories_high, max_apartments_per_floor } = this.parent as Building;
                    if (!value || !stories_high || !max_apartments_per_floor) return true; // skip if undefined
                    return value <= stories_high * max_apartments_per_floor;
               }
          ),
     max_apartments_per_floor: Yup.number()
          .required(t('buildings.yupBuildingMaxApartmentsPerFloorRequired'))
          .min(1, t('buildings.yupBuildingMaxApartmentsPerFloorRequired'))
          .test(
               'max-per-floor-check',
               t('buildings.yupBuildingMaxApartmentsPerFloorMaxCheck'),
               function (value) {
                    const { number_of_apartments } = this.parent as Building;
                    if (!value || !number_of_apartments) return true;
                    return value <= number_of_apartments;
               }
          ),
     has_ground_floor_apartments: Yup.boolean().required(t('buildings.yupBuildingHasGroundFloorApartmentsRequired')),
});
