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
     id: string;
     building_id: string;
     apartment_number: string;
     floor: number;
     square_meters?: number;
     room_count?: number;
     notes?: string;
     apartment_type: ApartmentType;
     apartment_status: ApartmentStatus;
     created_at?: Date;
     updated_at?: Date;
     // Storage-linked images (strings during create/update; rows on reads)
     apartment_images?: (string | ApartmentImage)[];
}

export interface ApartmentImage {
     id: string;
     created_at: string;
     updated_at: string;
     storage_bucket: string;
     storage_path: string;
     is_cover_image: boolean;
     apartment_id: string;
}

// Initial Values for Formik
export const apartmentInitialValues: Apartment = {
     id: '',
     building_id: '',
     apartment_number: '',
     floor: 0,
     square_meters: 0,
     room_count: 0,
     notes: '',
     apartment_type: 'residential',
     apartment_status: 'owned',
     created_at: new Date(),
     updated_at: new Date(),
     apartment_images: [],
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
export const apartmentImageValidationSchema = (t: (key: string) => string) =>
     Yup.object().shape({
          id: Yup.string().required(t('common.required')),
          created_at: Yup.string().required(t('common.required')),
          updated_at: Yup.string().required(t('common.required')),
          storage_bucket: Yup.string().required(t('common.required')),
          storage_path: Yup.string().required(t('common.required')),
          is_cover_image: Yup.boolean().required(t('common.required')),
          apartment_id: Yup.string().required(t('common.required')),
     });

export const apartmentValidationSchema = (t: (key: string) => string, apartmentId?: string) => Yup.object().shape({
     building_id: Yup.string(),
     apartment_number: Yup.string()
          .matches(/^[a-zA-Z0-9]+$/, t('errors.apartment.apartmentNumberMustBeAlphaNumeric'))
          .test(
               'unique-apartment-number',
               t('errors.apartment.apartmentNumberMustBeUnique'),
               async function (apartment_number) {
                    const { building_id } = this.parent as Apartment;

                    if (!apartment_number) return false;

                    const { exists, apartmentid: existingApartmentId } = await checkIfApartmentExistsInBuilding(
                         building_id,
                         apartment_number
                    );

                    // If it's an update and the existing match is the same record, allow it
                    if (exists && existingApartmentId === apartmentId) return true;

                    return !exists;
               }
          ).required(t('errors.apartment.apartmentNumberRequired')),
     floor: Yup.number().integer().test(
          'valid-floor',
          t('errors.apartment.apartmentFloorTooHigh'),
          async (value, context) => {
               const { building_id } = context.parent as Apartment;
               const { data: building } = await getBuildingById(building_id);

               if (!building) return false;

               return value! <= building.stories_high;
          }
     ).required(t('common.required')),
     square_meters: Yup.number().integer().min(0, t('errors.apartment.apartmentSquareMetersTooLow')).optional(),
     room_count: Yup.number().integer().min(1, t('errors.apartment.apartmentRoomCountTooLow')).max(10, t('errors.apartment.apartmentRoomCountTooHigh')).optional(),
     notes: Yup.string().optional(),
     apartment_type: Yup.string()
          .oneOf(ApartmentTypeValues)
          .required(t('common.required')),
     apartment_status: Yup.string()
          .oneOf(ApartmentStatusValues)
          .required(t('common.required')),
     apartment_images: Yup.array().of(
          apartmentImageValidationSchema(t)
     ).optional(),
});
