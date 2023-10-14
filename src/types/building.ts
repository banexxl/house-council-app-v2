export interface Building {
          _id?: string;
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
          parkingLotCount: number;
          appartmentCount: number;
          tenantCount: number;
          hasOwnElevator: boolean;
          hasOwnBicycleRoom: boolean;
          /////////////////////////////////////////
          unresolvedIssues: string[];
          inProgressIssues: string[];
          doneIssues: string[];
          tenantMeetings: string[],
          /////////////////////////////////////////
          hasGasHeating: boolean;
          hasCentralHeating: boolean;
          hasElectricHeating: boolean;
          hasSolarPower: boolean;
          hasOwnWaterPump: boolean;
          /////////////////////////////////////////
          image: Uint8Array;
          lng: number;
          lat: number;
          buildingStatus: boolean;
          /////////////////////////////////////////
          dateTimeAdded: Date;
          dateTimeUpdated: Date;
}

export interface buildingAPIResponse {
          message: string,
          data: Building[],
          totalCount: number
}
