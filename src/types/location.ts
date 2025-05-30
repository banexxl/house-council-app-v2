export interface BuildingLocation {
     id?: string; // UUID
     location_id: string; // Foreign key to tblLocations
     created_at?: Date; // Timestamp of creation
     updated_at?: Date; // Timestamp of last update
     street_address: string; // Optional street address
     city: string; // Optional city name
     region?: string; // Optional region or state
     country: string; // Optional country name
     street_number: string; // Street number, defaults to 1
     post_code: number; // Optional zip code
     latitude: number; // Optional latitude
     longitude: number; // Optional longitude
}
