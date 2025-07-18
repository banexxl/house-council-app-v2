import * as Yup from 'yup';

export type TenantType = 'owner' | 'renter' | 'relative' | 'other';

export const tenantTypeOptions = [
     { value: 'owner', label: 'tenants.lblOwner' },
     { value: 'renter', label: 'tenants.lblRenter' },
     { value: 'relative', label: 'tenants.lblRelative' },
     { value: 'other', label: 'tenants.lblOther' },
];

export interface Tenant {
     id: string;
     first_name: string;
     last_name: string;
     email?: string;
     phone_number?: string;
     date_of_birth?: string; // ISO string

     apartment_id: string;
     apartment: {
          apartment_number: string;
          building: {
               street_address: string;
               city: string;
          };
     };
     is_primary: boolean;
     move_in_date: string;   // ISO string
     move_out_date?: string; // ISO string or null

     tenant_type: TenantType;

     notes?: string;

     created_at?: string;
     updated_at?: string;

     user_id?: string; // optional FK to auth.users
}

export const tenantInitialValues: Tenant = {
     id: '',
     first_name: '',
     last_name: '',
     email: '',
     phone_number: '',
     date_of_birth: '',
     apartment_id: '',
     apartment: { apartment_number: '', building: { street_address: '', city: '' } },
     is_primary: false,
     move_in_date: '',
     move_out_date: '',
     tenant_type: 'owner',
     notes: '',
     created_at: new Date().toISOString(),
     updated_at: new Date().toISOString(),
};

export const tenantValidationSchema = (t: (key: string) => string) => Yup.object().shape({
     first_name: Yup.string().required(t('tenants.firstNameRequired')),
     last_name: Yup.string().required(t('tenants.lastNameRequired')),
     email: Yup.string().email('Invalid email'),
     phone_number: Yup.string(),
     date_of_birth: Yup.string().required(t('tenants.dateOfBirthRequired')),
     apartment_id: Yup.string().required(t('tenants.apartmentRequired')),
     is_primary: Yup.boolean().required(t('tenants.isPrimaryRequired')),
     move_in_date: Yup.date(),
     move_out_date: Yup.date()
});
