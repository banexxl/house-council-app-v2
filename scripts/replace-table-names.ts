#!/usr/bin/env node

/**
 * Script to replace hardcoded table names with environment variables
 * Run this script to automatically update your codebase to use the TABLES config
 * 
 * Usage: node scripts/replace-table-names.js
 */

import log from "src/utils/logger";

const fs = require('fs');
const path = require('path');

// Mapping of old table names to new TABLES constants
const TABLE_REPLACEMENTS = {
     'tblSuperAdmins': 'TABLES.SUPER_ADMINS',
     'tblClients': 'TABLES.CLIENTS',
     'tblClientMembers': 'TABLES.CLIENT_MEMBERS',
     'tblTenants': 'TABLES.TENANTS',
     'tblClient_Subscription': 'TABLES.CLIENT_SUBSCRIPTION',
     'tblSubscriptionPlans': 'TABLES.SUBSCRIPTION_PLANS',
     'tblSubscriptionPlans_Features': 'TABLES.SUBSCRIPTION_PLANS_FEATURES',
     'tblFeatures': 'TABLES.FEATURES',
     'tblBuildings': 'TABLES.BUILDINGS',
     'tblApartments': 'TABLES.APARTMENTS',
     'tblBuildingLocations': 'TABLES.BUILDING_LOCATIONS',
     'tblBuildingImages': 'TABLES.BUILDING_IMAGES',
     'tblApartmentImages': 'TABLES.APARTMENT_IMAGES',
     'tblBillingInformation': 'TABLES.BILLING_INFORMATION',
     'tblInvoices': 'TABLES.INVOICES',
     'tblNotifications': 'TABLES.NOTIFICATIONS',
     'tblServerLogs': 'TABLES.SERVER_LOGS',
};

// File extensions to process
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Directories to exclude
const EXCLUDE_DIRS = ['node_modules', '.git', '.next', 'dist', 'build'];

function shouldProcessFile(filePath: string) {
     // Check extension
     if (!EXTENSIONS.includes(path.extname(filePath))) {
          return false;
     }

     // Check if in excluded directory
     for (const excludeDir of EXCLUDE_DIRS) {
          if (filePath.includes(excludeDir)) {
               return false;
          }
     }

     return true;
}

function addImportIfNeeded(content: string, filePath: string) {
     // Skip if TABLES is already imported
     if (content.includes('import { TABLES }') || content.includes("import { TABLES }")) {
          return content;
     }

     // Skip if no table references found
     const hasTableReferences = Object.keys(TABLE_REPLACEMENTS).some(tableName =>
          content.includes(`'${tableName}'`) || content.includes(`"${tableName}"`)
     );

     if (!hasTableReferences) {
          return content;
     }

     // Find the right place to add the import
     const lines = content.split('\n');
     let importLineIndex = -1;

     // Look for existing imports from src/
     for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes("import") && lines[i].includes("from") && lines[i].includes("src/")) {
               importLineIndex = i;
          }
     }

     // If no src imports found, look for any imports
     if (importLineIndex === -1) {
          for (let i = 0; i < lines.length; i++) {
               if (lines[i].includes("import") && lines[i].includes("from")) {
                    importLineIndex = i;
               }
          }
     }

     // Add the import after the last import or at the beginning
     if (importLineIndex !== -1) {
          lines.splice(importLineIndex + 1, 0, "import { TABLES } from 'src/config/tables';");
     } else {
          // Add after any 'use client' or 'use strict' directives
          let insertIndex = 0;
          for (let i = 0; i < Math.min(3, lines.length); i++) {
               if (lines[i].includes('"use client"') || lines[i].includes("'use client'") ||
                    lines[i].includes('"use strict"') || lines[i].includes("'use strict'")) {
                    insertIndex = i + 1;
               }
          }
          lines.splice(insertIndex, 0, "import { TABLES } from 'src/config/tables';");
     }

     return lines.join('\n');
}

function replaceTableNames(content: string) {
     let updatedContent = content;

     for (const [oldName, newName] of Object.entries(TABLE_REPLACEMENTS)) {
          // Replace string literals
          updatedContent = updatedContent.replace(
               new RegExp(`'${oldName}'`, 'g'),
               newName
          );
          updatedContent = updatedContent.replace(
               new RegExp(`"${oldName}"`, 'g'),
               newName
          );
     }

     return updatedContent;
}

function processFile(filePath: string) {
     try {
          const content = fs.readFileSync(filePath, 'utf8');

          // Replace table names
          let updatedContent = replaceTableNames(content);

          // Add import if needed
          updatedContent = addImportIfNeeded(updatedContent, filePath);

          // Only write if content changed
          if (updatedContent !== content) {
               fs.writeFileSync(filePath, updatedContent, 'utf8');
               log(`✓ Updated: ${filePath}`);
               return true;
          }

          return false;
     } catch (error) {
          console.error(`✗ Error processing ${filePath}:`, error.message);
          return false;
     }
}

function walkDirectory(dir: any) {
     const files = fs.readdirSync(dir);
     const results = { processed: 0, updated: 0 };

     for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
               if (!EXCLUDE_DIRS.includes(file)) {
                    const subResults = walkDirectory(filePath);
                    results.processed += subResults.processed;
                    results.updated += subResults.updated;
               }
          } else if (shouldProcessFile(filePath)) {
               results.processed++;
               if (processFile(filePath)) {
                    results.updated++;
               }
          }
     }

     return results;
}

function main() {
     log('🔄 Replacing hardcoded table names with TABLES configuration...\n');

     const projectRoot = process.cwd();
     const srcDir = path.join(projectRoot, 'src');

     if (!fs.existsSync(srcDir)) {
          console.error('❌ src directory not found. Make sure you run this from the project root.');
          process.exit(1);
     }

     const results = walkDirectory(srcDir);

     log(`\n📊 Summary:`);
     log(`   Files processed: ${results.processed}`);
     log(`   Files updated: ${results.updated}`);
     log(`\n✅ Table name replacement complete!`);

     if (results.updated > 0) {
          log('\n📝 Next steps:');
          log('1. Review the changes in your version control');
          log('2. Test your application to ensure everything works');
          log('3. Update your Vercel environment variables with obfuscated table names');
     }
}

if (require.main === module) {
     main();
}

module.exports = { processFile, replaceTableNames, addImportIfNeeded };