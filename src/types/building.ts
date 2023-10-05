export interface Building {
          _id?: string;
          street: string;
          city: string;
          region: string;
          country: string;
          fullAddress: string;
          recentlyBuilt: boolean;
          dateTimeRegistered: Date;
          dateTimeUpdated: Date;
          appartmentCount: number;
          issueCount: number;
          issues: string[];
          hasOwnParkingLot: boolean;
          parkingLotCount: number;
          gasHeating: boolean;
          centralHeating: boolean;
          electricHeating: boolean;
          solarPower: boolean;
          hasOwnBicycleRoom: boolean;
          hasOwnWaterPump: boolean;
          hasOwnElevator: boolean;
          tenantMeetings: string[],
          tenantCount: number;
}
