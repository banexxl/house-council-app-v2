
import { Building } from '@/types/building';
import * as Yup from 'yup';

export interface BuildingOptions {
          label: string;
          value: string;
}

export const buildingCategoryOptions: BuildingOptions[] = [
          {
                    label: 'Recently built',
                    value: 'isRecentlyBuilt',
          },
          {
                    label: 'Has own parking',
                    value: 'hasOwnParkingLot',
          },
          {
                    label: 'Central heating',
                    value: 'hasCentralHeating',
          },
          {
                    label: 'Gas heating',
                    value: 'hasGasHeating',
          },
          {
                    label: 'Electric heating',
                    value: 'hasElectricHeating',
          },
          {
                    label: 'Solar power',
                    value: 'hasSolarPower',
          },
];

export interface BuildingFilters {
          fullAddress?: string;
          category: boolean[]
}

export const initialValues: Building = {
          _id: '',
          street: '',
          streetNumber: 0,
          city: '',
          region: '',
          country: '',
          fullAddress: '',
          isRecentlyBuilt: false,
          dateTimeRegistered: new Date,
          dateTimeUpdated: new Date,
          appartmentCount: 0,
          issueCount: 0,
          allReportedIssues: [],
          unresolvedIssues: [],
          inProgressIssues: [],
          doneIssues: [],
          hasOwnParkingLot: false,
          parkingLotCount: 0,
          hasGasHeating: false,
          hasCentralHeating: false,
          hasElectricHeating: false,
          hasSolarPower: false,
          hasOwnBicycleRoom: false,
          hasOwnWaterPump: false,
          hasOwnElevator: false,
          storiesHigh: 0,
          isToThreeStoriesHigh: false,
          tenantMeetings: [],
          tenantCount: 0,
          // image: new Uint8Array,
          buildingStatus: false,
};

export const validationSchema = Yup.object({
          _id: Yup.string().max(30),
          street: Yup.string().max(30),
          streetNumber: Yup.number(),
          city: Yup.string().max(30),
          region: Yup.string().max(30),
          country: Yup.string().max(30),
          fullAddress: Yup.string().max(30),
          isRecentlyBuilt: Yup.boolean(),
          dateTimeRegistered: Yup.date(),
          dateTimeUpdated: Yup.date(),
          appartmentCount: Yup.number(),
          issueCount: Yup.number(),
          allReportedIssues: Yup.array(),
          unresolvedIssues: Yup.array(),
          inProgressIssues: Yup.array(),
          doneIssues: Yup.array(),
          hasOwnParkingLot: Yup.boolean(),
          parkingLotCount: Yup.number(),
          hasGasHeating: Yup.boolean(),
          hasCentralHeating: Yup.boolean(),
          hasElectricHeating: Yup.boolean(),
          hasSolarPower: Yup.boolean(),
          hasOwnBicycleRoom: Yup.boolean(),
          hasOwnWaterPump: Yup.boolean(),
          hasOwnElevator: Yup.boolean(),
          storiesHigh: Yup.number(),
          isToThreeStoriesHigh: Yup.boolean(),
          tenantMeetings: Yup.array(),
          tenantCount: Yup.number(),
          //image: Yup.array(),
          buildingStatus: Yup.boolean(),
});
