import * as Yup from 'yup';
import dayjs from 'dayjs';

export type AnnouncementStatus = 'draft' | 'published';

// Category & Subcategory typing --------------------------------------------
export interface AnnouncementSubcategory {
     id: string;
     label: string;
     parentId: string; // category id
}

export interface AnnouncementCategory {
     id: string;
     label: string;
     subcategories: AnnouncementSubcategory[];
}

export const ANNOUNCEMENT_CATEGORIES: AnnouncementCategory[] = [
     {
          id: 'community_general',
          label: 'announcements.category.community_general',
          subcategories: [
               { id: 'general_updates', label: 'announcements.subcategory.general_updates', parentId: 'community_general' },
               { id: 'community_news', label: 'announcements.subcategory.community_news', parentId: 'community_general' },
               { id: 'lost_found', label: 'announcements.subcategory.lost_found', parentId: 'community_general' },
               { id: 'rules_policy_changes', label: 'announcements.subcategory.rules_policy_changes', parentId: 'community_general' },
               { id: 'seasonal_greetings', label: 'announcements.subcategory.seasonal_greetings', parentId: 'community_general' },
               { id: 'resident_welcome_messages', label: 'announcements.subcategory.resident_welcome_messages', parentId: 'community_general' }
          ]
     },
     {
          id: 'events_activities',
          label: 'announcements.category.events_activities',
          subcategories: [
               { id: 'upcoming_meetings', label: 'announcements.subcategory.upcoming_meetings', parentId: 'events_activities' },
               { id: 'social_events', label: 'announcements.subcategory.social_events', parentId: 'events_activities' },
               { id: 'workshops_classes', label: 'announcements.subcategory.workshops_classes', parentId: 'events_activities' },
               { id: 'sports_recreational', label: 'announcements.subcategory.sports_recreational', parentId: 'events_activities' },
               { id: 'volunteer_opportunities', label: 'announcements.subcategory.volunteer_opportunities', parentId: 'events_activities' },
               { id: 'holiday_decorations_competitions', label: 'announcements.subcategory.holiday_decorations_competitions', parentId: 'events_activities' }
          ]
     },
     {
          id: 'maintenance_operations',
          label: 'announcements.category.maintenance_operations',
          subcategories: [
               { id: 'scheduled_maintenance', label: 'announcements.subcategory.scheduled_maintenance', parentId: 'maintenance_operations' },
               { id: 'emergency_maintenance', label: 'announcements.subcategory.emergency_maintenance', parentId: 'maintenance_operations' },
               { id: 'renovation_construction_notices', label: 'announcements.subcategory.renovation_construction_notices', parentId: 'maintenance_operations' },
               { id: 'utility_outages', label: 'announcements.subcategory.utility_outages', parentId: 'maintenance_operations' },
               { id: 'pest_control_schedules', label: 'announcements.subcategory.pest_control_schedules', parentId: 'maintenance_operations' },
               { id: 'waste_collection_recycling_updates', label: 'announcements.subcategory.waste_collection_recycling_updates', parentId: 'maintenance_operations' },
               { id: 'parking_lot_changes', label: 'announcements.subcategory.parking_lot_changes', parentId: 'maintenance_operations' }
          ]
     },
     {
          id: 'safety_security',
          label: 'announcements.category.safety_security',
          subcategories: [
               { id: 'fire_drills_safety_training', label: 'announcements.subcategory.fire_drills_safety_training', parentId: 'safety_security' },
               { id: 'security_alerts', label: 'announcements.subcategory.security_alerts', parentId: 'safety_security' },
               { id: 'weather_alerts', label: 'announcements.subcategory.weather_alerts', parentId: 'safety_security' },
               { id: 'emergency_contacts_procedures', label: 'announcements.subcategory.emergency_contacts_procedures', parentId: 'safety_security' },
               { id: 'health_safety_protocols', label: 'announcements.subcategory.health_safety_protocols', parentId: 'safety_security' }
          ]
     },
     {
          id: 'financial_administrative',
          label: 'announcements.category.financial_administrative',
          subcategories: [
               { id: 'rent_fee_reminders', label: 'announcements.subcategory.rent_fee_reminders', parentId: 'financial_administrative' },
               { id: 'payment_deadlines', label: 'announcements.subcategory.payment_deadlines', parentId: 'financial_administrative' },
               { id: 'budget_financial_reports', label: 'announcements.subcategory.budget_financial_reports', parentId: 'financial_administrative' },
               { id: 'special_assessments_dues_increases', label: 'announcements.subcategory.special_assessments_dues_increases', parentId: 'financial_administrative' },
               { id: 'insurance_notices', label: 'announcements.subcategory.insurance_notices', parentId: 'financial_administrative' },
               { id: 'tax_related_announcements', label: 'announcements.subcategory.tax_related_announcements', parentId: 'financial_administrative' }
          ]
     },
     {
          id: 'resident_services',
          label: 'announcements.category.resident_services',
          subcategories: [
               { id: 'package_delivery_notices', label: 'announcements.subcategory.package_delivery_notices', parentId: 'resident_services' },
               { id: 'new_amenities', label: 'announcements.subcategory.new_amenities', parentId: 'resident_services' },
               { id: 'internet_wifi_changes', label: 'announcements.subcategory.internet_wifi_changes', parentId: 'resident_services' },
               { id: 'facility_booking_confirmations', label: 'announcements.subcategory.facility_booking_confirmations', parentId: 'resident_services' },
               { id: 'concierge_updates', label: 'announcements.subcategory.concierge_updates', parentId: 'resident_services' },
               { id: 'lost_key_access_card_info', label: 'announcements.subcategory.lost_key_access_card_info', parentId: 'resident_services' }
          ]
     },
     {
          id: 'voting_governance',
          label: 'announcements.category.voting_governance',
          subcategories: [
               { id: 'meeting_agendas', label: 'announcements.subcategory.meeting_agendas', parentId: 'voting_governance' },
               { id: 'voting_announcements', label: 'announcements.subcategory.voting_announcements', parentId: 'voting_governance' },
               { id: 'poll_results', label: 'announcements.subcategory.poll_results', parentId: 'voting_governance' },
               { id: 'board_decisions_minutes_summaries', label: 'announcements.subcategory.board_decisions_minutes_summaries', parentId: 'voting_governance' }
          ]
     },
     {
          id: 'urgent_priority',
          label: 'announcements.category.urgent_priority',
          subcategories: [
               { id: 'emergency_evacuation_instructions', label: 'announcements.subcategory.emergency_evacuation_instructions', parentId: 'urgent_priority' },
               { id: 'immediate_utility_cutoff_alerts', label: 'announcements.subcategory.immediate_utility_cutoff_alerts', parentId: 'urgent_priority' },
               { id: 'missing_person_pet_alerts', label: 'announcements.subcategory.missing_person_pet_alerts', parentId: 'urgent_priority' },
               { id: 'hazard_warnings', label: 'announcements.subcategory.hazard_warnings', parentId: 'urgent_priority' }
          ]
     }
];

// Helper structures for mapping to translated labels at runtime
export const announcementCategoryLabelMap: Record<string, string> = Object.fromEntries(
     ANNOUNCEMENT_CATEGORIES.map(cat => [cat.id, cat.label])
);

export const announcementSubcategoryLabelMap: Record<string, string> = Object.fromEntries(
     ANNOUNCEMENT_CATEGORIES.flatMap(cat => cat.subcategories.map(sc => [sc.id, sc.label]))
);

// Utility to get localized category list (pass i18n t)
export const getLocalizedAnnouncementCategories = (t: (key: string) => string) =>
     ANNOUNCEMENT_CATEGORIES.map(cat => ({
          id: cat.id,
          label: t(cat.label),
          subcategories: cat.subcategories.map(sc => ({ id: sc.id, label: t(sc.label), parentId: sc.parentId }))
     }));

export type AnnouncementCategoryId = typeof ANNOUNCEMENT_CATEGORIES[number]['id'];
export type AnnouncementSubcategoryId = ReturnType<typeof extractSubcategoryIds>[number];

function extractSubcategoryIds() {
     return ANNOUNCEMENT_CATEGORIES.flatMap(c => c.subcategories.map(sc => sc.id)) as string[];
}

export interface Announcement {
     id: string;
     title: string;
     message: string;
     category: AnnouncementCategoryId | '';
     subcategory: string;
     buildings: string[];
     attachments: File[];
     pinned: boolean;
     archived?: boolean;
     schedule_enabled: boolean;
     // Naive local timestamp (no timezone / Z) in format YYYY-MM-DDTHH:mm:ss when scheduled
     scheduled_at: string | null;
     // IANA timezone identifier captured from the user's browser when scheduling
     scheduled_timezone?: string | null;
     created_at: Date;
     updated_at?: Date;
     status: AnnouncementStatus;
     images?: string[]; // existing image URLs when editing
     documents?: { url: string; name: string; mime?: string }[]; // existing document URLs when editing
     user_id: string; // FK to auth.users
     client_id: string; // FK to tblClients
}

export const announcementInitialValues: Announcement = {
     id: '',
     title: '',
     message: '',
     category: '',
     subcategory: '',
     buildings: [],
     attachments: [],
     pinned: false,
     schedule_enabled: false,
     created_at: new Date(),
     scheduled_at: null,
     scheduled_timezone: null,
     status: 'draft',
     images: [],
     documents: [],
     user_id: '',
     client_id: ''
};

const isHtmlEmpty = (html?: string) => {
     const text = (html ?? '')
          .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]*>/g, '')        // strip tags
          .replace(/&nbsp;|&#160;/gi, ' ') // nbsp to space
          .trim();
     return text.length === 0;
};


export const buildAnnouncementValidationSchema = (t: (key: string) => string) => {
     return Yup.object({
          title: Yup.string()
               .trim()
               .when('status', {
                    is: (val: AnnouncementStatus) => val === 'published',
                    then: s => s.min(3, t('announcements.validation.titleTooShort')).required(t('announcements.validation.titleRequired')),
                    otherwise: s => s.max(200, t('announcements.validation.titleMax'))
               }).required(t('announcements.validation.titleRequired')),
          message: Yup.string()
               .transform(v => (isHtmlEmpty(v) ? '' : v))
               .required(t('announcements.validation.messageRequired'))
               .test('not-empty-html', t('announcements.validation.messageRequired'), v => !isHtmlEmpty(v)),
          category: Yup.string().required(t('announcements.validation.categoryRequired')),
          subcategory: Yup.string().when('category', {
               is: (category: string) => {
                    if (!category) return false;
                    const cat = ANNOUNCEMENT_CATEGORIES.find(c => c.id === category);
                    return !!cat && cat.subcategories.length > 0;
               },
               then: s => s.required(t('announcements.validation.subcategoryRequired')),
               otherwise: s => s
          }),
          client_id: Yup.string().required(t('announcements.validation.clientRequired')),
          buildings: Yup.array().of(Yup.string())
               .min(1, t('announcements.validation.buildingsMin'))
               .required(t('announcements.validation.buildingsRequired')),
          attachments: Yup.array().of(Yup.mixed<File>()).default([]),
          pinned: Yup.boolean().default(false),
          schedule_enabled: Yup.boolean().default(false),
          scheduled_timezone: Yup.string().nullable().when('schedule_enabled', {
               is: true,
               then: s => s.required(t('announcements.validation.timezoneRequired')),
               otherwise: s => s.nullable()
          }),
          scheduled_at: Yup.string().nullable().when(['schedule_enabled', 'scheduled_timezone'], {
               is: (enabled: boolean) => enabled,
               then: s => s
                    .required(t('announcements.validation.scheduleRequired'))
                    .test('valid-format', t('announcements.validation.scheduleInvalid'), (value) => {
                         if (!value) return false;
                         const asDay = dayjs(value);
                         if (asDay.isValid()) return true;
                         return false;
                    })
                    .test('future', t('announcements.validation.scheduleFuture'), (value) => {
                         if (!value) return false;
                         const d = dayjs(value);
                         if (!d.isValid()) return false;
                         return d.isAfter(dayjs().subtract(1, 'minute'));
                    }),
               otherwise: s => s.nullable()
          }),
          status: Yup.mixed<AnnouncementStatus>().oneOf(['draft', 'published']).required(t('announcements.validation.statusRequired'))
     }) as Yup.ObjectSchema<Announcement>;
};

// Default (legacy) schema export using identity translator so existing imports keep working.
export const announcementValidationSchema = buildAnnouncementValidationSchema((k) => k);
