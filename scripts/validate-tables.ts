/**
 * Simple validation script to check table configuration
 * Run with: node scripts/validate-tables.js
 */

import log from "src/utils/logger";

// Mock the process.env for testing
process.env.NEXT_PUBLIC_SUPABASE_TBL_SUPER_ADMIN = "tblSuperAdmins";
process.env.NEXT_PUBLIC_SUPABASE_TBL_CLIENTS = "tblClients";
process.env.NEXT_PUBLIC_SUPABASE_TBL_CLIENT_MEMBERS = "tblClientMembers";
process.env.NEXT_PUBLIC_SUPABASE_TBL_TENANTS = "tblTenants";
process.env.NEXT_PUBLIC_SUPABASE_TBL_CLIENT_SUBSCRIPTION = "tblClient_Subscription";
process.env.NEXT_PUBLIC_SUPABASE_TBL_NOTIFICATIONS = "tblNotifications";
process.env.NEXT_PUBLIC_SUPABASE_TBL_BUILDING_LOCATIONS = "tblBuildingLocations";
process.env.NEXT_PUBLIC_SUPABASE_TBL_SERVER_LOGS = "tblServerLogs";
process.env.NEXT_PUBLIC_SUPABASE_TBL_BUILDING_IMAGES = "tblBuildingImages";
process.env.NEXT_PUBLIC_SUPABASE_TBL_APARTMENT_IMAGES = "tblApartmentImages";
process.env.NEXT_PUBLIC_SUPABASE_TBL_FEATURES = "tblFeatures";
process.env.NEXT_PUBLIC_SUPABASE_TBL_BUILDINGS = "tblBuildings";
process.env.NEXT_PUBLIC_SUPABASE_TBL_APARTMENTS = "tblApartments";
process.env.NEXT_PUBLIC_SUPABASE_TBL_SUBSCRIPTION_PLANS = "tblSubscriptionPlans";
process.env.NEXT_PUBLIC_SUPABASE_TBL_SUBSCRIPTION_PLANS_FEATURES = "tblSubscriptionPlans_Features";
process.env.NEXT_PUBLIC_SUPABASE_TBL_BILLING_INFORMATION = "tblBillingInformation";
process.env.NEXT_PUBLIC_SUPABASE_TBL_INVOICES = "tblInvoices";
process.env.NEXT_PUBLIC_SUPABASE_TBL_ANNOUNCEMENTS = "tblAnnouncements";
process.env.NEXT_PUBLIC_SUPABASE_TBL_ANNOUNCEMENT_IMAGES = "tblAnnouncementImages";
process.env.NEXT_PUBLIC_SUPABASE_TBL_ANNOUNCEMENT_DOCUMENTS = "tblAnnouncementDocuments";
process.env.NEXT_PUBLIC_SUPABASE_TBL_BUILDINGS_ANNOUNCEMENTS = "tblBuildings_Announcements";

try {
     // Test import
     const { TABLES, validateTableConfig } = require('../src/config/tables.ts');

     log('✅ TABLES configuration loaded successfully');
     log('📊 Available tables:');

     Object.entries(TABLES).forEach(([key, value]) => {
          log(`   ${key}: ${value}`);
     });

     // Test validation
     validateTableConfig();
     log('✅ All environment variables are properly set');

     log('\n🎉 Table configuration is valid!');

} catch (error) {
     console.error('❌ Error validating table configuration:', error.message);
     process.exit(1);
}