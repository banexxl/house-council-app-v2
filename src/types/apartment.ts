import { checkIfApartmentExistsInBuilding } from 'src/app/actions/apartment/apartment-actions';
import { getBuildingById } from 'src/app/actions/building/building-actions';
import * as Yup from 'yup';

// Apartment Type Enum (String Literal Union)
export type ApartmentType =
     | 'residential'
     | 'business'
     | 'mixed_use'
     | 'vacation'
     | 'storage'
     | 'garage'
     | 'utility';

// Rental Status Enum (String Literal Union)
export type RentalStatus =
     | 'owned'
     | 'rented'
     | 'for_rent'
     | 'vacant';

// Apartment Entity Interface
export interface Apartment {
     id?: string;
     building_id: string;
     apartment_number: string;
     floor: number;
     square_meters?: number;
     room_count?: number;
     notes?: string;
     apartment_type?: ApartmentType;
     rental_status?: RentalStatus;
     created_at?: string;
     updated_at?: string;
     apartment_images?: {
          image_url: string;
          is_cover_image: boolean;
     }[];
}

// Initial Values for Formik
export const apartmentInitialValues: Apartment = {
     building_id: '',
     apartment_number: '',
     floor: 0,
     square_meters: 0,
     room_count: 0,
     notes: '',
     apartment_type: 'residential',
     rental_status: 'owned',
};

// Explicit allowed values for validation
export const ApartmentTypeValues: ApartmentType[] = [
     'residential',
     'business',
     'mixed_use',
     'vacation',
     'storage',
     'garage',
     'utility'
];

export const RentalStatusValues: RentalStatus[] = [
     'owned',
     'rented',
     'for_rent',
     'vacant'
];

// Yup Validation Schema
export const apartmentValidationSchema = Yup.object().shape({
     building_id: Yup.string().required('Required'),
     apartment_number: Yup.string().test(
          'unique-apartment-number',
          'Apartment number already exists in this building',
          async (value, context) => {
               const { building_id } = context.parent as Apartment;
               const { exists } = await checkIfApartmentExistsInBuilding(
                    building_id,
                    value!
               );
               console.log('exists', exists);

               return !exists;
          }
     ).required('Required'),
     floor: Yup.number().integer().test(
          'valid-floor',
          'Floor cannot be higher than the building stories',
          async (value, context) => {
               const { building_id } = context.parent as Apartment;
               const { data: building } = await getBuildingById(building_id);
               if (!building) return false;

               return value! <= building.stories_high;
          }
     ).required('Required'),
     square_meters: Yup.number().integer().min(0).optional(),
     room_count: Yup.number().integer().min(0).max(8, 'Room count cannot be greater than 8').optional(),
     notes: Yup.string().optional(),
     apartment_type: Yup.string()
          .oneOf(ApartmentTypeValues)
          .required('Required'),
     rental_status: Yup.string()
          .oneOf(RentalStatusValues)
          .required('Required'),
     apartment_images: Yup.array().of(
          Yup.object().shape({
               image_url: Yup.string().url().required('Required'),
               is_cover_image: Yup.boolean().required('Required'),
          })
     ).optional(),
});
