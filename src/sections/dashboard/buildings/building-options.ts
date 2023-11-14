
import { Building } from '@/types/building';
import moment from 'moment';
import * as Yup from 'yup';

var date = moment.utc().format('YYYY-MM-DD HH:mm:ss');
var stillUtc = moment.utc(date).toDate();
var localDateTime = moment(stillUtc).local().format('DD.MM.YYYY HH:mm:ss');

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
          buildingAddress?: string;
          category: boolean[]
}

export const initialValues: Building = {
          region: '',
          buildingAddress: '',
          isRecentlyBuilt: false,
          description: '',
          dateTimeAdded: `${localDateTime}`,
          dateTimeUpdated: '',
          hasOwnParkingLot: false,
          hasGasHeating: false,
          hasCentralHeating: false,
          hasElectricHeating: false,
          hasSolarPower: false,
          hasOwnBicycleRoom: false,
          hasOwnWaterPump: false,
          hasOwnElevator: false,
          storiesHigh: 0,
          tenantMeetings: [],
          image: '',
          buildingStatus: false,
          lng: 19.8227,
          lat: 45.2396,
          tenants: [],
          invoices: [],
          parkingLots: [],
          board: '',
          isActive: true
};

export const validationSchema = Yup.object({
          region: Yup.string().max(30),
          buildingAddress: Yup.string().required("This field is mandatory").max(70),
          isRecentlyBuilt: Yup.boolean(),
          dateTimeRegistered: Yup.date(),
          dateTimeUpdated: Yup.date(),
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
          image: Yup.string(),
          buildingStatus: Yup.boolean(),
});
