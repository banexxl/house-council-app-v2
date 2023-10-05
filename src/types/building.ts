export interface Building {
          _id?: string;
          street: string;
          city: string;
          region: string;
          country: string;
          fullAddress: string;
          isRecentlyBuilt: boolean;
          dateTimeRegistered: Date;
          dateTimeUpdated: Date;
          appartmentCount: number;
          issueCount: number;
          issues: string[];
          hasOwnParkingLot: boolean;
          parkingLotCount: number;
          hasGasHeating: boolean;
          hasCentralHeating: boolean;
          hasElectricHeating: boolean;
          hasSolarPower: boolean;
          hasOwnBicycleRoom: boolean;
          hasOwnWaterPump: boolean;
          hasOwnElevator: boolean;
          storiesHigh: number;
          isToThreeStoriesHigh: boolean;
          tenantMeetings: string[],
          tenantCount: number;
}

export interface buildingAPIResponse {
          message: string,
          data: Building[],
          totalCount: number
}
