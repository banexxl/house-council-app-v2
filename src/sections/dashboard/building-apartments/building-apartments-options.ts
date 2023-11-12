
import { BuildingApartment } from '@/types/building-appartment';
import * as Yup from 'yup';

export const initialValues: BuildingApartment = {
          buildingAddress: '',
          apartmentNumber: 0,
          surfaceArea: 0,
          bedroomNumber: 0,
          bathroomNumber: 0,
          terraceNumber: 0,
          description: '',
          images: [],
          tenants: [],
          owners: [],
          status: '',
          petFriendly: false,
          smokingAllowed: false,
          furnished: false,
          hasOwnParking: false,
          utilitiesIncluded: false,
          createdDateTime: '',
          updatedDateTime: ''
};

export const validationSchema = Yup.object({
          buildingAddress: Yup.string().required('Full address of the apartment is required'),
          apartmentNumber: Yup.number().min(1, 'Must be a non zero positive number').max(500, 'To many apartments'),
          surfaceArea: Yup.number().min(1, 'Must be a non zero positive number'),
          bedroomNumber: Yup.number().min(1, 'Must be a non zero positive number'),
          bathroomNumber: Yup.number().min(1, 'Must be a non zero positive number'),
          terraceNumber: Yup.number().min(0, 'Must be a positive number'),
          owners: Yup.array().min(1, 'You must specify at least one owner'),
          description: Yup.string(),
          //images: Yup.array(),
          tenants: Yup.array(),
          status: Yup.string(),
          petFriendly: Yup.boolean(),
          smokingAllowed: Yup.boolean(),
          furnished: Yup.boolean(),
          hasOwnParking: Yup.boolean(),
          utilitiesIncluded: Yup.boolean(),
          createdDateTime: Yup.string(),
          updatedDateTime: Yup.string(),
});
