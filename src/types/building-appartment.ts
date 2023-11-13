import { Customer } from "./customer";

export interface BuildingApartment {
          _id?: string;
          buildingAddress: string;
          apartmentNumber: number;
          surfaceArea: number;
          bedroomNumber: number;
          bathroomNumber: number;
          terraceNumber: number;
          description: string;
          images: string[];
          tenants: Customer[];
          owners: Customer[];
          status: string;
          petFriendly?: boolean;
          smokingAllowed?: boolean;
          furnished?: boolean;
          hasOwnParking: boolean;
          utilitiesIncluded?: boolean;
          createdDateTime: string;
          updatedDateTime: string;
}
