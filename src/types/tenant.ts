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
     avatar_url?: string;
     is_primary: boolean;
     move_in_date: string;   // ISO string
     tenant_type: TenantType;
     notes?: string;
     created_at?: string;
     updated_at?: string;
     user_id?: string; //  FK to auth.users
     email_opt_in: boolean;
     sms_opt_in: boolean;
     viber_opt_in: boolean;
     whatsapp_opt_in: boolean;

     // Chat-related properties (from Contact, Participant, BuildingUser types)
     avatar?: string; // Alternative avatar field (for compatibility)
     last_activity?: number; // Last activity timestamp
     name?: string; // Computed full name (for compatibility)
     is_online?: boolean; // Online status
     user_type?: 'tenant' | 'client';
     apartment_number?: string; // Computed from apartment relation

     // Chat room membership properties
     role?: 'member' | 'admin' | 'moderator'; // Chat room role
     joined_at?: string; // When user joined chat room
     last_read_at?: string; // Last message read timestamp
     is_muted?: boolean; // Chat notifications muted
}

export const tenantInitialValues: Tenant = {
     id: '',
     first_name: '',
     last_name: '',
     email: '',
     phone_number: '', // plus sign now visual only; store raw digits
     date_of_birth: '',
     apartment_id: '',
     apartment: { apartment_number: '', building: { street_address: '', city: '' } },
     avatar_url: '',
     is_primary: false,
     move_in_date: '',
     tenant_type: 'owner',
     notes: '',
     created_at: new Date().toISOString(),
     updated_at: new Date().toISOString(),
     email_opt_in: false,
     sms_opt_in: false,
     viber_opt_in: false,
     whatsapp_opt_in: false,
};

export const tenantValidationSchema = (t: (key: string) => string) => Yup.object().shape({
     first_name: Yup.string().required(t('tenants.firstNameRequired')),
     last_name: Yup.string().required(t('tenants.lastNameRequired')),
     email: Yup.string()
          .email(t('tenants.emailMustBeValid')).max(40)
          .when('is_primary', {
               is: (is_primary: boolean) => is_primary === true,
               then: (schema: Yup.StringSchema) => schema.required(t('tenants.emailRequired')),
               otherwise: (schema: Yup.StringSchema) => schema.notRequired()
          }),
     phone_number: Yup.string()
          .when('is_primary', {
               is: (is_primary: boolean) => is_primary === true,
               then: (schema: Yup.StringSchema) =>
                    schema
                         .required(t('tenants.phoneNumberRequired'))
                         .matches(/^\d{7,15}$/, t('tenants.phoneNumberDigitsOnly')),
               otherwise: (schema: Yup.StringSchema) =>
                    schema.matches(/^$|^\d{7,15}$/, t('tenants.phoneNumberDigitsOnly')),
          })
          .matches(/^$|^\d{7,15}$/, t('tenants.phoneNumberDigitsOnly')),
     date_of_birth: Yup.date().nullable(),
     apartment_id: Yup.string().required(t('tenants.apartmentRequired')),
     is_primary: Yup.boolean().required(t('tenants.isPrimaryRequired')),
     move_in_date: Yup.date().nullable(),
});

// Helper functions for chat compatibility
export const tenantToContact = (tenant: Tenant) => ({
     id: tenant.id,
     avatar: tenant.avatar || tenant.avatar_url || '',
     is_online: tenant.is_online || false,
     lastActivity: tenant.last_activity,
     name: tenant.name || `${tenant.first_name} ${tenant.last_name}`.trim(),
});

export const tenantToParticipant = (tenant: Tenant) => ({
     id: tenant.id,
     avatar: tenant.avatar || tenant.avatar_url || null,
     lastActivity: tenant.last_activity,
     name: tenant.name || `${tenant.first_name} ${tenant.last_name}`.trim(),
});

export const tenantToBuildingUser = (tenant: Tenant) => ({
     id: tenant.id,
     email: tenant.email || '',
     first_name: tenant.first_name,
     last_name: tenant.last_name,
     user_type: (tenant.user_type || 'tenant') as 'tenant' | 'client',
     apartment_number: tenant.apartment_number || tenant.apartment?.apartment_number,
     avatar: tenant.avatar || tenant.avatar_url,
     is_online: tenant.is_online || false,
});

export const tenantToChatSender = (tenant: Tenant) => ({
     id: tenant.id,
     email: tenant.email,
     first_name: tenant.first_name,
     last_name: tenant.last_name,
     user_type: (tenant.user_type || 'tenant') as 'tenant' | 'admin',
});

export const tenantToChatMemberUser = (tenant: Tenant) => ({
     id: tenant.id,
     email: tenant.email,
     first_name: tenant.first_name,
     last_name: tenant.last_name,
});

// Helper to get display name (first name only)
export const getTenantFirstName = (tenant: Tenant): string => {
     return tenant.first_name || tenant.name?.split(' ')[0] || tenant.email || 'Unknown';
};

// Helper to get full display name
export const getTenantFullName = (tenant: Tenant): string => {
     if (tenant.name) return tenant.name;
     return `${tenant.first_name} ${tenant.last_name}`.trim() || tenant.email || 'Unknown';
};

// Helper to get avatar URL
export const getTenantAvatar = (tenant: Tenant): string => {
     return tenant.avatar || tenant.avatar_url || '';
};
