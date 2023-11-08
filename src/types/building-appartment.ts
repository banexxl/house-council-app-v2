export interface BuildingApartment {
          _id?: string;
          fullAddress: string;
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
          createdAt: string;
          updatedAt: string;
}
