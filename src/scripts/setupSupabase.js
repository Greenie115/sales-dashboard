#!/usr/bin/env node

/**
 * Script to set up Supabase resources for the sharing functionality.
 * 
 * Usage:
 *   node src/scripts/setupSupabase.js
 * 
 * This script will:
 * 1. Create the 'raw-datasets' storage bucket if it doesn't exist
 * 2. Ensure the 'shared_dashboards' table has the correct schema
 */

// Import the setup function
require('../utils/setupSharing').default();

console.log('Setup script started. Check the logs for details.');
