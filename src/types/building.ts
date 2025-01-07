export interface Building {
     id: string; // UUID
     createdAt: Date; // Timestamp of creation
     updatedAt: Date; // Timestamp of last update
     isRecentlyBuilt: boolean; // Is the building recently built
     description: string; // Description of the building
     hasParkingLog: boolean; // Does the building have parking
     hasGasHeating: boolean; // Does the building use gas heating
     hasCentralHeating: boolean; // Does the building use central heating
     hasElectricHeating: boolean; // Does the building use electric heating
     hasSolarPower: boolean; // Does the building use solar power
     hasBicycleRoom: boolean; // Does the building have a bicycle storage room
     hasPreHeatedWater: boolean; // Does the building have pre-heated water
     hasElevator: boolean; // Does the building have an elevator
     storiesHigh: number; // Number of floors
     buildingLocationId?: string | null; // Reference to building location
     buildingStatusId?: string | null; // Reference to building status
     numberOfApartments: number; // Number of apartments in the building
     clientId?: string | null; // Reference to the client who owns the building
}
