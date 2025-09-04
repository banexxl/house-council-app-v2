import * as Yup from 'yup';

export type AnnouncementStatus = 'draft' | 'published';
export type AnnouncementScope = 'building' | 'apartments' | 'tenants' | 'tenant_groups';

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
          label: 'Community & General',
          subcategories: [
               { id: 'general_updates', label: 'General Updates', parentId: 'community_general' },
               { id: 'community_news', label: 'Community News', parentId: 'community_general' },
               { id: 'lost_found', label: 'Lost & Found', parentId: 'community_general' },
               { id: 'rules_policy_changes', label: 'Rules & Policy Changes', parentId: 'community_general' },
               { id: 'seasonal_greetings', label: 'Seasonal Greetings', parentId: 'community_general' },
               { id: 'resident_welcome_messages', label: 'Resident Welcome Messages', parentId: 'community_general' }
          ]
     },
     {
          id: 'events_activities',
          label: 'Events & Activities',
          subcategories: [
               { id: 'upcoming_meetings', label: 'Upcoming Meetings', parentId: 'events_activities' },
               { id: 'social_events', label: 'Social Events', parentId: 'events_activities' },
               { id: 'workshops_classes', label: 'Workshops or Classes', parentId: 'events_activities' },
               { id: 'sports_recreational', label: 'Sports & Recreational Activities', parentId: 'events_activities' },
               { id: 'volunteer_opportunities', label: 'Volunteer Opportunities', parentId: 'events_activities' },
               { id: 'holiday_decorations_competitions', label: 'Holiday Decorations / Competitions', parentId: 'events_activities' }
          ]
     },
     {
          id: 'maintenance_operations',
          label: 'Maintenance & Operations',
          subcategories: [
               { id: 'scheduled_maintenance', label: 'Scheduled Maintenance', parentId: 'maintenance_operations' },
               { id: 'emergency_maintenance', label: 'Emergency Maintenance', parentId: 'maintenance_operations' },
               { id: 'renovation_construction_notices', label: 'Renovation/Construction Notices', parentId: 'maintenance_operations' },
               { id: 'utility_outages', label: 'Utility Outages', parentId: 'maintenance_operations' },
               { id: 'pest_control_schedules', label: 'Pest Control Schedules', parentId: 'maintenance_operations' },
               { id: 'waste_collection_recycling_updates', label: 'Waste Collection / Recycling Updates', parentId: 'maintenance_operations' },
               { id: 'parking_lot_changes', label: 'Parking Lot Closures or Changes', parentId: 'maintenance_operations' }
          ]
     },
     {
          id: 'safety_security',
          label: 'Safety & Security',
          subcategories: [
               { id: 'fire_drills_safety_training', label: 'Fire Drills / Safety Training', parentId: 'safety_security' },
               { id: 'security_alerts', label: 'Security Alerts', parentId: 'safety_security' },
               { id: 'weather_alerts', label: 'Weather Alerts', parentId: 'safety_security' },
               { id: 'emergency_contacts_procedures', label: 'Emergency Contacts & Procedures', parentId: 'safety_security' },
               { id: 'health_safety_protocols', label: 'Health & Safety Protocols', parentId: 'safety_security' }
          ]
     },
     {
          id: 'financial_administrative',
          label: 'Financial & Administrative',
          subcategories: [
               { id: 'rent_fee_reminders', label: 'Rent / Fee Reminders', parentId: 'financial_administrative' },
               { id: 'payment_deadlines', label: 'Payment Deadlines', parentId: 'financial_administrative' },
               { id: 'budget_financial_reports', label: 'Budget & Financial Reports', parentId: 'financial_administrative' },
               { id: 'special_assessments_dues_increases', label: 'Special Assessments / Dues Increases', parentId: 'financial_administrative' },
               { id: 'insurance_notices', label: 'Insurance Notices', parentId: 'financial_administrative' },
               { id: 'tax_related_announcements', label: 'Tax-related Announcements', parentId: 'financial_administrative' }
          ]
     },
     {
          id: 'resident_services',
          label: 'Resident Services',
          subcategories: [
               { id: 'package_delivery_notices', label: 'Package Delivery Notices', parentId: 'resident_services' },
               { id: 'new_amenities', label: 'New Amenities', parentId: 'resident_services' },
               { id: 'internet_wifi_changes', label: 'Internet / Wi-Fi Service Changes', parentId: 'resident_services' },
               { id: 'facility_booking_confirmations', label: 'Facility Booking Confirmations', parentId: 'resident_services' },
               { id: 'concierge_updates', label: 'Concierge Updates', parentId: 'resident_services' },
               { id: 'lost_key_access_card_info', label: 'Lost Key / Access Card Replacement Info', parentId: 'resident_services' }
          ]
     },
     {
          id: 'voting_governance',
          label: 'Voting & Governance',
          subcategories: [
               { id: 'meeting_agendas', label: 'Meeting Agendas', parentId: 'voting_governance' },
               { id: 'voting_announcements', label: 'Voting Announcements', parentId: 'voting_governance' },
               { id: 'poll_results', label: 'Poll Results', parentId: 'voting_governance' },
               { id: 'board_decisions_minutes_summaries', label: 'Board Decisions / Minutes Summaries', parentId: 'voting_governance' }
          ]
     },
     {
          id: 'urgent_priority',
          label: 'Urgent / Priority',
          subcategories: [
               { id: 'emergency_evacuation_instructions', label: 'Emergency Evacuation Instructions', parentId: 'urgent_priority' },
               { id: 'immediate_utility_cutoff_alerts', label: 'Immediate Water/Electricity Cut-off Alerts', parentId: 'urgent_priority' },
               { id: 'missing_person_pet_alerts', label: 'Missing Person or Pet Alerts', parentId: 'urgent_priority' },
               { id: 'hazard_warnings', label: 'Hazard Warnings', parentId: 'urgent_priority' }
          ]
     }
];

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
     subcategory: string; // optional; required only if category has subcategories & publishing
     visibility: AnnouncementScope;
     apartments: string[];
     tenants: string[];
     tenant_groups: string[];
     attachments: File[];
     pinned: boolean;
     archived?: boolean;
     schedule_enabled: boolean;
     schedule_at: Date | null;
     created_at: Date;
     updated_at?: Date;
     status: AnnouncementStatus;
     images?: string[]; // existing image URLs when editing
}

export const announcementInitialValues: Announcement = {
     id: '',
     title: '',
     message: '',
     category: '',
     subcategory: '',
     visibility: 'building',
     apartments: [],
     tenants: [],
     tenant_groups: [],
     attachments: [],
     pinned: false,
     schedule_enabled: false,
     created_at: new Date(),
     schedule_at: null,
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
     category: Yup.string().required('Category required'),
     subcategory: Yup.string().when('category', {
          is: (category: string) => {
               if (!category) return false; // category itself not chosen yet (category validation will handle)
               const cat = ANNOUNCEMENT_CATEGORIES.find(c => c.id === category);
               return !!cat && cat.subcategories.length > 0;
          },
          then: s => s.required('Subcategory required'),
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
     tenant_groups: Yup.array().of(Yup.string()).default([]).when('visibility', {
          is: 'tenant_groups',
          then: s => s.min(1, 'Select at least one group'),
          otherwise: s => s
     }),
     attachments: Yup.array().of(Yup.mixed<File>()).default([]),
     pinned: Yup.boolean().default(false),
     schedule_enabled: Yup.boolean().default(false),
     schedule_at: Yup.date().nullable().when('schedule_enabled', {
          is: true,
          then: s => s.typeError('Invalid date').required('Schedule time required'),
          otherwise: s => s.nullable()
     }),
     status: Yup.mixed<AnnouncementStatus>().oneOf(['draft', 'published']).required()
}) as Yup.ObjectSchema<Announcement>;
