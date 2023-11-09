export interface BuildingApartment {
          _id?: string;
          apartmentAddress: string;
          apartmentNumber: number;
          surfaceArea: number;
          bedroomNumber: number;
          bathroomNumber: number;
          terraceNumber: number;
          description: string;
          images: string;
          tenants: string[];
          status: string;
          petFriendly?: boolean;
          smokingAllowed?: boolean;
          furnished?: boolean;
          owners: string[];
          hasOwnParking: boolean;
          utilitiesIncluded?: boolean;
          createdDateTime: string;
          updatedDateTime: string;
}
