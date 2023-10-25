export interface Building {
          _id?: string;
          isActive: boolean;
          street: string;
          streetNumber: number
          city: string;
          region: string;
          country: string;
          fullAddress: string;
          description: string;
          /////////////////////////////////////////
          isRecentlyBuilt: boolean;
          storiesHigh: number;
          hasOwnParkingLot: boolean;
          appartmentCount: number;
          hasOwnElevator: boolean;
          hasOwnBicycleRoom: boolean;
          /////////////////////////////////////////
          hasGasHeating: boolean;
          hasCentralHeating: boolean;
          hasElectricHeating: boolean;
          hasSolarPower: boolean;
          hasOwnWaterPump: boolean;
          /////////////////////////////////////////
          image: string[];
          lng: number;
          lat: number;
          buildingStatus: boolean;
          /////////////////////////////////////////
          dateTimeAdded: string;
          dateTimeUpdated: string;
          /////////////////////////////////////////
          tenants: string[];
          tenantMeetings: string[],
          invoices: string[],
          parkingLots: string[],
          board: string
}

export interface buildingAPIResponse {
          message: string,
          data: Building[],
          totalCount: number
}
