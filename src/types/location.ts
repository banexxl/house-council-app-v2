export interface BuildingLocation {
     id?: string; // UUID
     created_at?: Date; // Timestamp of creation
     updated_at?: Date; // Timestamp of last update
     streetAddress: string; // Optional street address
     city: string; // Optional city name
     region?: string; // Optional region or state
     country: string; // Optional country name
     streetNumber: string; // Street number, defaults to 1
     post_code: number; // Optional zip code
     latitude: number; // Optional latitude
     longitude: number; // Optional longitude
}
