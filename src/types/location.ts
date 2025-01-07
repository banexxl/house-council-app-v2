export interface Location {
     id: string; // UUID
     createdAt: Date; // Timestamp of creation
     updatedAt: Date; // Timestamp of last update
     streetAddress?: string; // Optional street address
     city?: string; // Optional city name
     region?: string; // Optional region or state
     country?: string; // Optional country name
     streetNumber?: number; // Street number, defaults to 1
     parentId?: string | null; // Optional parent location for hierarchy
}
