import { BaseEntity } from "./base-entity";
import { BuildingLocation } from "./location";

export interface Building {
     id: string;
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
     has_pre_heating: boolean;
     has_elevator: boolean;
     stories_high: number;
     building_location: BuildingLocation;
     building_status_id: BaseEntity;
     number_of_apartments: number;
     client_id: string;
     cover_image: string;
}
