# Dashboard Sharing Functionality

This document explains how to set up and use the dashboard sharing functionality.

## Overview

The sharing functionality allows users to:
1. Generate shareable links to the dashboard
2. Share the complete raw dataset with clients
3. Apply initial filters to the shared view
4. Control whether clients can apply their own filters

## Setup

### Prerequisites

- Supabase project with Storage and Database enabled
- Environment variables configured:
  - `REACT_APP_SUPABASE_URL`: Your Supabase project URL
  - `REACT_APP_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Installation

1. Install required dependencies:
   ```
   npm install uuid pako
   ```

2. Set up Supabase resources:
   ```
   node src/scripts/setupSupabase.js
   ```
   
   This script will:
   - Create a `raw-datasets` storage bucket in Supabase
   - Create or update the `shared_dashboards` table schema

   If the script fails, you may need to manually create these resources using the SQL provided in the script output.

## How It Works

### Data Flow

1. **Upload**: When a CSV file is uploaded, the data is:
   - Processed and stored in the React app state
   - Uploaded to Supabase Storage as a JSON file
   - A unique `storageId` is generated and stored in the app state

2. **Share**: When a user clicks "Share":
   - The current `storageId` is retrieved
   - Current filters are captured (if sharing with filters)
   - A record is created in the `shared_dashboards` table with:
     - A unique `shareId`
     - The `storageId` reference
     - Initial filters (optional)
     - Metadata (client name, allowed tabs, etc.)
   - A shareable link is generated: `/share/{shareId}`

3. **View**: When a client opens the shared link:
   - The `shareId` is extracted from the URL
   - The record is fetched from the `shared_dashboards` table
   - The raw data is downloaded from Supabase Storage using the `storageId`
   - The data is displayed according to the initial filters
   - If allowed, the client can apply their own filters

### Components

- **DataContext**: Manages data upload and storage
- **SharingContext**: Manages share link generation
- **SharedDashboardView**: Displays the shared dashboard
- **sharingService**: Handles Supabase interactions

## Usage

### Sharing a Dashboard

1. Upload a CSV file to the dashboard
2. Configure the dashboard as desired (apply filters, select tabs, etc.)
3. Click the "Share" button
4. Configure sharing options in the modal:
   - Set expiry date (optional)
   - Add a client note (optional)
   - Enable/disable client filtering
   - Select which tabs to include
5. Click "Generate Link"
6. Copy the generated link to share with your client

### Viewing a Shared Dashboard

The client simply needs to open the shared link in their browser. They will see:
- The dashboard with the data and filters you configured
- Filter controls (if you enabled client filtering)
- Only the tabs you selected to include

## Troubleshooting

### Common Issues

- **"Dataset has not been saved yet"**: Wait for the upload to complete or try re-uploading the file.
- **"Failed to download shared data"**: The data file may have been deleted from storage.
- **"Share link is expired"**: The share link has reached its expiry date.

### Debugging

- Check browser console for detailed error messages
- Verify Supabase credentials and connectivity
- Ensure the storage bucket and database table exist

## Security Considerations

- Shared links do not require authentication to view
- Consider setting expiry dates for sensitive data
- The raw data is stored in Supabase Storage and can be accessed with the correct `storageId`
- Configure appropriate bucket policies in Supabase to restrict access if needed
