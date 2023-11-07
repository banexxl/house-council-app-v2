
import { BuildingApartment } from '@/types/building-appartment';
import moment from 'moment';
import * as Yup from 'yup';

export const initialValues: BuildingApartment = {
          fullAddress: '',
          apartmentNumber: 0,
          surfaceArea: 0,
          bedroomNumber: 0,
          bathroomNumber: 0,
          terraceNumber: 0,
          description: '',
          images: 'string',
          tenants: [],
          status: '',
          petFriendly: false,
          smokingAllowed: false,
          furnished: false,
          owners: [],
          hasOwnParking: false,
          utilitiesIncluded: false,
          createdAt: '',
          updatedAt: ''
};

export const validationSchema = Yup.object({
          fullAddress: Yup.string().required('Full address of the apartment is required'),
          apartmentNumber: Yup.number().min(1, 'Apartment number must be a non zero positive number'),
          surfaceArea: Yup.number().min(1, 'Apartment area must be a non zero positive number'),
          bedroomNumer: Yup.number().min(1, 'Bedroom number must be a non zero positive number'),
          bathroomNumber: Yup.number().min(1, 'Bathroom number must be a non zero positive number'),
          terraceNumber: Yup.number().min(1, 'Terrace number must be a non zero positive number'),
          description: Yup.string(),
          images: Yup.string(),
          tenants: Yup.string(),
          status: Yup.string(),
          petFriendly: Yup.boolean(),
          smokingAllowed: Yup.boolean(),
          furnished: Yup.boolean(),
          owners: Yup.string(),
          hasOwnParking: Yup.boolean(),
          utilitiesIncluded: Yup.boolean(),
          createdAt: Yup.string(),
          updatedAt: Yup.string(),
});
