import * as Yup from 'yup';

export type AnnouncementStatus = 'draft' | 'published';
export type AnnouncementScope = 'building' | 'apartments' | 'tenants' | 'tenant_groups';

export interface AnnouncementItem {
     id: string;
     title: string;
     pinned?: boolean;
     archived?: boolean;
}

export interface AnnouncementFormValues {
     title: string;
     message: string;
     category: string;
     visibility: AnnouncementScope;
     apartments: string[];
     tenants: string[];
     tenantGroups: string[];
     attachments: File[];
     pin: boolean;
     scheduleEnabled: boolean;
     scheduleAt: Date | null;
     status: AnnouncementStatus;
}

export const announcementInitialValues: AnnouncementFormValues = {
     title: '',
     message: '',
     category: '',
     visibility: 'building',
     apartments: [],
     tenants: [],
     tenantGroups: [],
     attachments: [],
     pin: false,
     scheduleEnabled: false,
     scheduleAt: null,
     status: 'draft'
};

export const announcementValidationSchema = Yup.object({
     title: Yup.string()
          .trim()
          .when('status', {
               is: (val: AnnouncementStatus) => val === 'published',
               then: s => s.min(3, 'Title too short').required('Title required'),
               otherwise: s => s.max(200, 'Max 200 chars')
          }),
     message: Yup.string()
          .when('status', {
               is: 'published',
               then: s => s.trim().min(5, 'Message too short').required('Message required'),
               otherwise: s => s
          }),
     category: Yup.string()
          .when('status', {
               is: 'published',
               then: s => s.required('Category required'),
               otherwise: s => s
          }),
     visibility: Yup.mixed<AnnouncementScope>().oneOf(['building', 'apartments', 'tenants', 'tenant_groups']).required('Visibility required'),
     apartments: Yup.array().of(Yup.string()).default([]).when('visibility', {
          is: 'apartments',
          then: s => s.min(1, 'Select at least one apartment'),
          otherwise: s => s
     }),
     tenants: Yup.array().of(Yup.string()).default([]).when('visibility', {
          is: 'tenants',
          then: s => s.min(1, 'Select at least one tenant'),
          otherwise: s => s
     }),
     tenantGroups: Yup.array().of(Yup.string()).default([]).when('visibility', {
          is: 'tenantGroups',
          then: s => s.min(1, 'Select at least one group'),
          otherwise: s => s
     }),
     attachments: Yup.array().of(Yup.mixed<File>()).default([]),
     pin: Yup.boolean().default(false),
     scheduleEnabled: Yup.boolean().default(false),
     scheduleAt: Yup.date().nullable().when('scheduleEnabled', {
          is: true,
          then: s => s.typeError('Invalid date').required('Schedule time required'),
          otherwise: s => s.nullable()
     }),
     status: Yup.mixed<AnnouncementStatus>().oneOf(['draft', 'published']).required()
}) as Yup.ObjectSchema<AnnouncementFormValues>;
