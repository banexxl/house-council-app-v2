# Database Table Name Obfuscation Setup

This guide explains how to configure environment variables to hide your actual database table names from client-side code, which is especially useful for production deployments.

## Overview

All database table names are now centralized in `src/config/tables.ts` and can be obfuscated using environment variables. This prevents actual table names from being exposed in the browser's developer tools.

## Local Development Setup

Your `.env` file should contain all the table name mappings:

```bash
# Core entities
NEXT_PUBLIC_SUPABASE_TBL_SUPER_ADMIN="tblSuperAdmins"
NEXT_PUBLIC_SUPABASE_TBL_CLIENTS="tblClients"
NEXT_PUBLIC_SUPABASE_TBL_CLIENT_MEMBERS="tblClientMembers"
NEXT_PUBLIC_SUPABASE_TBL_TENANTS="tblTenants"

# Subscription system
NEXT_PUBLIC_SUPABASE_TBL_CLIENT_SUBSCRIPTION="tblClient_Subscription"
NEXT_PUBLIC_SUPABASE_TBL_SUBSCRIPTION_PLANS="tblSubscriptionPlans"
NEXT_PUBLIC_SUPABASE_TBL_SUBSCRIPTION_PLANS_FEATURES="tblSubscriptionPlans_Features"
NEXT_PUBLIC_SUPABASE_TBL_FEATURES="tblFeatures"

# Building and location system
NEXT_PUBLIC_SUPABASE_TBL_BUILDINGS="tblBuildings"
NEXT_PUBLIC_SUPABASE_TBL_APARTMENTS="tblApartments"
NEXT_PUBLIC_SUPABASE_TBL_BUILDING_LOCATIONS="tblBuildingLocations"

# Image management
NEXT_PUBLIC_SUPABASE_TBL_BUILDING_IMAGES="tblBuildingImages"
NEXT_PUBLIC_SUPABASE_TBL_APARTMENT_IMAGES="tblApartmentImages"

# Billing and payments
NEXT_PUBLIC_SUPABASE_TBL_BILLING_INFORMATION="tblBillingInformation"
NEXT_PUBLIC_SUPABASE_TBL_INVOICES="tblInvoices"

# Announcements
NEXT_PUBLIC_SUPABASE_TBL_ANNOUNCEMENTS="tblAnnouncements"
NEXT_PUBLIC_SUPABASE_TBL_ANNOUNCEMENT_IMAGES="tblAnnouncementImages"
NEXT_PUBLIC_SUPABASE_TBL_ANNOUNCEMENT_DOCUMENTS="tblAnnouncementDocuments"
NEXT_PUBLIC_SUPABASE_TBL_BUILDINGS_ANNOUNCEMENTS="tblBuildings_Announcements"

# System
NEXT_PUBLIC_SUPABASE_TBL_NOTIFICATIONS="tblNotifications"
NEXT_PUBLIC_SUPABASE_TBL_SERVER_LOGS="tblServerLogs"
```

## Production Setup (Vercel)

For production, you can use obfuscated names to hide your actual table structure:

### Step 1: Access Vercel Environment Variables

1. Go to your Vercel dashboard
2. Select your project
3. Navigate to "Settings" → "Environment Variables"

### Step 2: Add Obfuscated Environment Variables

Add the following environment variables with obfuscated values:

```bash
# Example obfuscated names for production
NEXT_PUBLIC_SUPABASE_TBL_SUPER_ADMINS="t1"
NEXT_PUBLIC_SUPABASE_TBL_CLIENTS="t2"
NEXT_PUBLIC_SUPABASE_TBL_CLIENT_MEMBERS="t3"
NEXT_PUBLIC_SUPABASE_TBL_TENANTS="t4"
NEXT_PUBLIC_SUPABASE_TBL_CLIENT_SUBSCRIPTION="t5"
NEXT_PUBLIC_SUPABASE_TBL_SUBSCRIPTION_PLANS="t6"
NEXT_PUBLIC_SUPABASE_TBL_SUBSCRIPTION_PLANS_FEATURES="t7"
NEXT_PUBLIC_SUPABASE_TBL_FEATURES="t8"
NEXT_PUBLIC_SUPABASE_TBL_BUILDINGS="t9"
NEXT_PUBLIC_SUPABASE_TBL_APARTMENTS="t10"
NEXT_PUBLIC_SUPABASE_TBL_BUILDING_LOCATIONS="t11"
NEXT_PUBLIC_SUPABASE_TBL_BUILDING_IMAGES="t12"
NEXT_PUBLIC_SUPABASE_TBL_APARTMENT_IMAGES="t13"
NEXT_PUBLIC_SUPABASE_TBL_BILLING_INFORMATION="t14"
NEXT_PUBLIC_SUPABASE_TBL_INVOICES="t15"
NEXT_PUBLIC_SUPABASE_TBL_ANNOUNCEMENTS="t16"
NEXT_PUBLIC_SUPABASE_TBL_ANNOUNCEMENT_IMAGES="t17"
NEXT_PUBLIC_SUPABASE_TBL_ANNOUNCEMENT_DOCUMENTS="t18"
NEXT_PUBLIC_SUPABASE_TBL_BUILDINGS_ANNOUNCEMENTS="t19"
NEXT_PUBLIC_SUPABASE_TBL_NOTIFICATIONS="t20"
NEXT_PUBLIC_SUPABASE_TBL_SERVER_LOGS="t21"
```

### Step 3: Set Environment for Each Stage

Make sure to set these variables for the appropriate environments:
- **Production**: Use obfuscated names
- **Preview**: Can use obfuscated names or real names
- **Development**: Should match your local `.env` file

## Usage in Code

After setting up the environment variables, use the `TABLES` configuration in your code:

```typescript
import { TABLES } from 'src/config/tables';

// Instead of:
// supabase.from('tblClients').select('*')

// Use:
supabase.from(TABLES.CLIENTS).select('*')
```

## Migration Process

The migration has been automated with a script. All existing hardcoded table names have been replaced with the `TABLES` configuration.

### Files Updated

The following files have been automatically updated:
- All action files in `src/app/actions/`
- All layout components
- Supabase utility functions
- Realtime listeners
- Form components

### Validation

Run the validation script to ensure everything is configured correctly:

```bash
node scripts/validate-tables.js
```

## Security Benefits

1. **Table Name Obfuscation**: Actual table names are hidden from client-side code
2. **Easy Rotation**: You can change obfuscated names anytime without code changes
3. **Environment Separation**: Different environments can use different naming schemes
4. **Reduced Attack Surface**: Makes it harder for attackers to understand your database structure

## Troubleshooting

### Missing Environment Variables

If you see an error about missing environment variables, ensure all variables from the list above are set in your environment.

### TypeScript Errors

If you encounter TypeScript errors about `TABLES` not being found, make sure the import is added:

```typescript
import { TABLES } from 'src/config/tables';
```

### Runtime Errors

If you get runtime errors about undefined table names, check that:
1. Environment variables are properly set
2. Variable names match exactly (case-sensitive)
3. No typos in environment variable names

## Alternative Obfuscation Strategies

Instead of simple numbers, you could use:

1. **Random strings**: `"ax7k2m"`, `"pg9n4r"`, etc.
2. **Themed names**: `"users"`, `"profiles"`, `"records"`, etc.
3. **Hash-based**: Use consistent hashing of actual names

## Example Vercel Deployment

When deploying to Vercel, your environment variables will be automatically injected at build time, and users will only see the obfuscated names in the browser developer tools instead of your actual database table structure.

The actual database operations will still use the correct table names, but the client-side bundle will contain only the obfuscated versions.