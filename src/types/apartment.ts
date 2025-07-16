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
export type ApartmentStatus =
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
     apartment_type: ApartmentType;
     apartment_status: ApartmentStatus;
     created_at: string;
     updated_at?: string;
     apartment_images?: string[];
     cover_image?: string;
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
     apartment_status: 'owned',
     created_at: ''
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

export const ApartmentStatusValues: ApartmentStatus[] = [
     'owned',
     'rented',
     'for_rent',
     'vacant'
];

export const apartmentTypeMap: Record<string, string> = {
     residential: 'apartments.lblApartmentTypeResidential',
     business: 'apartments.lblApartmentTypeBusiness',
     mixed_use: 'apartments.lblApartmentTypeMixedUse',
     vacation: 'apartments.lblApartmentTypeVacation',
     storage: 'apartments.lblApartmentTypeStorage',
     garage: 'apartments.lblApartmentTypeGarage',
     utility: 'apartments.lblApartmentTypeUtility',
};

export const apartmentStatusMap: Record<string, string> = {
     owned: 'apartments.lblOwned',
     rented: 'apartments.lblRented',
     for_rent: 'apartments.lblForRent',
     vacant: 'apartments.lblVacant',
}

// Yup Validation Schema
export const apartmentValidationSchema = (t: (key: string) => string, apartmentId?: string) => Yup.object().shape({
     building_id: Yup.string().required('Required'),
     apartment_number: Yup.string()
          .matches(/^[a-zA-Z0-9]+$/, t('errors.apartment.apartmentNumberMustBeAlphaNumeric'))
          .test(
               'unique-apartment-number',
               t('errors.apartment.apartmentNumberMustBeUnique'),
               async function (apartment_number) {
                    const { building_id } = this.parent as Apartment;

                    if (!apartment_number || !building_id) return false;

                    const { exists, apartmentid: existingApartmentId } = await checkIfApartmentExistsInBuilding(
                         building_id,
                         apartment_number
                    );

                    // If it's an update and the existing match is the same record, allow it
                    if (exists && existingApartmentId === apartmentId) return true;

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
     apartment_status: Yup.string()
          .oneOf(ApartmentStatusValues)
          .required('Required'),
     apartment_images: Yup.array().of(
          Yup.string().url('Invalid image URL').required('Required')).optional(),
});
