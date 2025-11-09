/**
 * Database table names configuration
 * 
 * All table names are centralized here using environment variables.
 * This allows for easy obfuscation in production environments by
 * setting different values in Vercel environment variables.
 * 
 * Usage:
 * import { TABLES } from '@/config/tables';
 * supabase.from(TABLES.CLIENTS).select('*');
 */

export const TABLES = {
     // Core entities
     SUPER_ADMINS: process.env.NEXT_PUBLIC_SUPABASE_TBL_SUPER_ADMINS!,
     CLIENTS: process.env.NEXT_PUBLIC_SUPABASE_TBL_CLIENTS!,
     CLIENT_MEMBERS: process.env.NEXT_PUBLIC_SUPABASE_TBL_CLIENT_MEMBERS!,
     TENANTS: process.env.NEXT_PUBLIC_SUPABASE_TBL_TENANTS!,

     // Subscription system
     CLIENT_SUBSCRIPTION: process.env.NEXT_PUBLIC_SUPABASE_TBL_CLIENT_SUBSCRIPTION!,
     SUBSCRIPTION_PLANS: process.env.NEXT_PUBLIC_SUPABASE_TBL_SUBSCRIPTION_PLANS!,
     SUBSCRIPTION_PLANS_FEATURES: process.env.NEXT_PUBLIC_SUPABASE_TBL_SUBSCRIPTION_PLANS_FEATURES!,
     FEATURES: process.env.NEXT_PUBLIC_SUPABASE_TBL_FEATURES!,

     // Building and location system
     BUILDINGS: process.env.NEXT_PUBLIC_SUPABASE_TBL_BUILDINGS!,
     APARTMENTS: process.env.NEXT_PUBLIC_SUPABASE_TBL_APARTMENTS!,
     BUILDING_LOCATIONS: process.env.NEXT_PUBLIC_SUPABASE_TBL_BUILDING_LOCATIONS!,

     // Image management
     BUILDING_IMAGES: process.env.NEXT_PUBLIC_SUPABASE_TBL_BUILDING_IMAGES!,
     APARTMENT_IMAGES: process.env.NEXT_PUBLIC_SUPABASE_TBL_APARTMENT_IMAGES!,

     // Billing and payments
     BILLING_INFORMATION: process.env.NEXT_PUBLIC_SUPABASE_TBL_BILLING_INFORMATION!,
     INVOICES: process.env.NEXT_PUBLIC_SUPABASE_TBL_INVOICES!,

     // Announcements
     ANNOUNCEMENTS: process.env.NEXT_PUBLIC_SUPABASE_TBL_ANNOUNCEMENTS!,
     ANNOUNCEMENT_IMAGES: process.env.NEXT_PUBLIC_SUPABASE_TBL_ANNOUNCEMENT_IMAGES!,
     ANNOUNCEMENT_DOCUMENTS: process.env.NEXT_PUBLIC_SUPABASE_TBL_ANNOUNCEMENT_DOCUMENTS!,
     BUILDINGS_ANNOUNCEMENTS: process.env.NEXT_PUBLIC_SUPABASE_TBL_BUILDINGS_ANNOUNCEMENTS!,
     CALENDAR_EVENTS: process.env.NEXT_PUBLIC_SUPABASE_TBL_CALENDAR_EVENTS!,

     // System
     NOTIFICATIONS: process.env.NEXT_PUBLIC_SUPABASE_TBL_NOTIFICATIONS!,
     SERVER_LOGS: process.env.NEXT_PUBLIC_SUPABASE_TBL_SERVER_LOGS!,

     // Polls
     POLLS: process.env.NEXT_PUBLIC_SUPABASE_TBL_POLLS!,
     POLL_OPTIONS: process.env.NEXT_PUBLIC_SUPABASE_TBL_POLL_OPTIONS!,
     POLL_ATTACHMENTS: process.env.NEXT_PUBLIC_SUPABASE_TBL_POLL_ATTACHMENTS!,
     POLL_VOTES: process.env.NEXT_PUBLIC_SUPABASE_TBL_POLL_VOTES!,

     // Chat system
     CHAT_ROOMS: process.env.NEXT_PUBLIC_SUPABASE_TBL_CHAT_ROOMS!,
     CHAT_ROOM_MEMBERS: process.env.NEXT_PUBLIC_SUPABASE_TBL_CHAT_ROOM_MEMBERS!,
     CHAT_MESSAGES: process.env.NEXT_PUBLIC_SUPABASE_TBL_CHAT_MESSAGES!,
     CHAT_MESSAGE_READS: process.env.NEXT_PUBLIC_SUPABASE_TBL_CHAT_MESSAGE_READS!,
     CHAT_TYPING: process.env.NEXT_PUBLIC_SUPABASE_TBL_CHAT_TYPING!,
} as const;

// Type for all table names
export type TableName = typeof TABLES[keyof typeof TABLES];

// Validation function to ensure all environment variables are set
export function validateTableConfig(): void {
     const missingVars: string[] = [];

     Object.entries(TABLES).forEach(([key, value]) => {
          if (!value || value === 'undefined') {
               missingVars.push(`NEXT_PUBLIC_SUPABASE_TBL_${key}`);
          }
     });

     if (missingVars.length > 0) {
          throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
     }
}

// Development helper to show actual table names (only in dev mode)
export function getTableMappingForDev(): Record<string, string> {
     if (process.env.NODE_ENV !== 'development') {
          return {};
     }

     return Object.fromEntries(
          Object.entries(TABLES).map(([key, value]) => [key, value])
     );
}