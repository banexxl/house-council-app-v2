export interface BuildingLocation {
     id?: string; // UUID
     createdAt?: Date; // Timestamp of creation
     updatedAt?: Date; // Timestamp of last update
     streetAddress: string; // Optional street address
     city: string; // Optional city name
     region?: string; // Optional region or state
     country: string; // Optional country name
     streetNumber: string; // Street number, defaults to 1
     zip?: string; // Optional zip code
     latitude?: number; // Optional latitude
     longitude?: number; // Optional longitude
}
