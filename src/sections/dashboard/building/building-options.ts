
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

export interface Values {
          barcode: string;
          category: string;
          description: string;
          images: string[];
          name: string;
          newPrice: number;
          oldPrice: number;
          sku: string;
          submit: null;
}

export const initialValues: Values = {
          barcode: '925487986526',
          category: '',
          description: '',
          images: [],
          name: '',
          newPrice: 0,
          oldPrice: 0,
          sku: 'IYV-8745',
          submit: null,
};

export const validationSchema = Yup.object({
          _id: Yup.string().max(30),
          street: Yup.string().max(30),
          city: Yup.string().max(30),
          region: Yup.string().max(30),
          country: Yup.string().max(30),
          fullAddress: Yup.string().max(30),
          recentlyBuilt: Yup.boolean(),
          dateTimeRegistered: Yup.date(),
          dateTimeUpdated: Yup.date(),
          appartmentCount: Yup.number().max(150),
          issueCount: Yup.number(),
          issues: Yup.array(),
          hasOwnParkingLot: Yup.boolean(),
          parkingLotCount: Yup.number(),
          gasHeating: Yup.boolean(),
          centralHeating: Yup.boolean(),
          electricHeating: Yup.boolean(),
          solarPower: Yup.boolean(),
          hasOwnBicycleRoom: Yup.boolean(),
          hasOwnWaterPump: Yup.boolean(),
          hasOwnElevator: Yup.boolean(),
          tenantMeetings: Yup.array(),
          tenantCount: Yup.number(),
});
