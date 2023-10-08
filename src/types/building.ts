export interface Building {
          _id?: string;
          street: string;
          streetNumber: number
          city: string;
          region: string;
          country: string;
          fullAddress: string;
          isRecentlyBuilt: boolean;
          dateTimeRegistered: Date;
          dateTimeUpdated: Date;
          appartmentCount: number;
          issueCount: number;
          allReportedIssues: string[];
          unresolvedIssues: string[];
          inProgressIssues: string[];
          doneIssues: string[];
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
          // image: Uint8Array;
          long: number;
          lat: number;
          buildingStatus: boolean;
}

export interface buildingAPIResponse {
          message: string,
          data: Building[],
          totalCount: number
}
