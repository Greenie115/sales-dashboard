/**
 * Supabase Setup Script for Sharing Functionality
 * 
 * This script sets up the necessary Supabase resources for the sharing functionality:
 * 1. Creates the 'raw-datasets' storage bucket if it doesn't exist
 * 2. Ensures the 'shared_dashboards' table has the correct schema
 * 
 * Run this script once to set up your Supabase project.
 */

import supabase from './supabase';

/**
 * Main setup function
 */
async function setupSharingResources() {
  console.log('Setting up Supabase resources for sharing functionality...');
  
  try {
    // Check if Supabase client is available
    if (!supabase.isAvailable()) {
      throw new Error('Supabase client is not available. Check your environment variables.');
    }
    
    // Setup storage bucket
    await setupStorageBucket();
    
    // Setup database table
    await setupDatabaseTable();
    
    console.log('✅ Setup completed successfully!');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Please check your Supabase configuration and try again.');
  }
}

/**
 * Set up the storage bucket for raw datasets
 */
async function setupStorageBucket() {
  console.log('Setting up storage bucket...');
  
  const bucketName = 'raw-datasets';
  
  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.getClient().storage.listBuckets();
  
  if (listError) {
    throw new Error(`Failed to list storage buckets: ${listError.message}`);
  }
  
  const bucketExists = buckets.some(bucket => bucket.name === bucketName);
  
  if (bucketExists) {
    console.log(`Storage bucket '${bucketName}' already exists.`);
  } else {
    // Create the bucket
    const { error: createError } = await supabase.getClient().storage.createBucket(bucketName, {
      public: false, // Set to true if you want the files to be publicly accessible
    });
    
    if (createError) {
      throw new Error(`Failed to create storage bucket: ${createError.message}`);
    }
    
    console.log(`Storage bucket '${bucketName}' created successfully.`);
  }
  
  // Set up bucket policies (optional)
  // This example allows authenticated users to upload and download files
  // Adjust according to your security requirements
  const { error: policyError } = await supabase.getClient().storage.from(bucketName).createPolicy(
    'authenticated-read-write',
    {
      name: 'authenticated-read-write',
      definition: {
        role: 'authenticated',
        operations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      },
    }
  );
  
  if (policyError) {
    console.warn(`Warning: Failed to set bucket policy: ${policyError.message}`);
    console.warn('You may need to configure bucket policies manually in the Supabase dashboard.');
  } else {
    console.log(`Bucket policy set successfully.`);
  }
}

/**
 * Set up the database table for shared dashboards
 */
async function setupDatabaseTable() {
  console.log('Setting up database table...');
  
  const tableName = 'shared_dashboards';
  
  // Check if table exists
  const { error: existsError } = await supabase.getClient()
    .from(tableName)
    .select('count')
    .limit(1)
    .single();
  
  const tableExists = !existsError || !existsError.message.includes('does not exist');
  
  if (!tableExists) {
    // Create the table
    const { error: createError } = await supabase.getClient().rpc('create_shared_dashboards_table');
    
    if (createError) {
      // If the RPC function doesn't exist, we'll need to create the table using SQL
      console.warn(`Warning: Failed to create table using RPC: ${createError.message}`);
      console.warn('You may need to create the table manually using the SQL below:');
      console.warn(`
CREATE TABLE public.shared_dashboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_id TEXT UNIQUE NOT NULL,
  config_data TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0
);

-- Add indexes
CREATE INDEX idx_shared_dashboards_share_id ON public.shared_dashboards(share_id);
CREATE INDEX idx_shared_dashboards_created_at ON public.shared_dashboards(created_at);
      `);
      
      // Try to continue anyway - the table might have been created manually
    } else {
      console.log(`Table '${tableName}' created successfully.`);
    }
  } else {
    console.log(`Table '${tableName}' already exists.`);
    
    // Check if the table has the required columns
    const { data: columns, error: columnsError } = await supabase.getClient()
      .rpc('get_table_columns', { table_name: tableName });
    
    if (columnsError) {
      console.warn(`Warning: Failed to check table columns: ${columnsError.message}`);
      console.warn('You may need to update the table schema manually.');
    } else {
      const columnNames = columns.map(col => col.column_name);
      
      // Check for required columns
      const requiredColumns = ['share_id', 'config_data', 'metadata', 'created_at', 'expires_at', 'access_count'];
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.warn(`Warning: Table is missing required columns: ${missingColumns.join(', ')}`);
        console.warn('You may need to update the table schema manually using SQL ALTER TABLE statements.');
      } else {
        console.log('Table schema looks good!');
      }
    }
  }
}

// Run the setup
setupSharingResources().catch(console.error);

export default setupSharingResources;
