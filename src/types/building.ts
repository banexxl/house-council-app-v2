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
}

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
     stories_high: 0,
     number_of_apartments: 0,
     client_id: '',
     building_images: [],
     building_status: '',
     created_at: new Date(),
     updated_at: new Date(),
     building_location: null
};

export const buildingValidationSchema = Yup.object({
     building_location: Yup.object({
          street_address: Yup.string().required('Required'),
          city: Yup.string().required('Required'),
          country: Yup.string().required('Required'),
          street_number: Yup.string().required('Required'),
          post_code: Yup.number().required('Required'),
          latitude: Yup.number().required('Required'),
          longitude: Yup.number().required('Required')
     }),
     description: Yup.string().max(5000),
     stories_high: Yup.number().min(1).required(),
     number_of_apartments: Yup.number().min(0).required(),
     building_status: Yup.string().required('Required'),
     building_images: Yup.array()
});
