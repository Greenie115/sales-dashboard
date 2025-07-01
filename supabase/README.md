# Supabase Setup for Sales Dashboard

This directory contains the database schema and setup instructions for the Supabase backend used by the Sales Dashboard application.

## Setup Instructions

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. Copy your project URL and anon key from the Supabase dashboard
3. Create a `.env` file in the root directory based on `.env.example`
4. Add your Supabase URL and anon key to the `.env` file

## Database Schema

The application uses the following tables:

### shared_dashboards

Stores shared dashboard configurations and data for client sharing.

- `id`: Auto-incrementing primary key
- `share_id`: UUID used in share URLs
- `share_config`: JSON configuration for the shared dashboard
- `created_at`: Timestamp when the share was created
- `expires_at`: Timestamp when the share expires
- `created_by`: User ID who created the share

## Applying Migrations

You can apply the migrations manually by:

1. Going to the SQL Editor in your Supabase dashboard
2. Copying the contents of the migration files in the `migrations` directory
3. Running the SQL commands

## Data Structure

The `share_config` JSON object contains:

```json
{
  "allowedTabs": ["summary", "sales"],
  "activeTab": "summary",
  "hideRetailers": false,
  "hideTotals": false,
  "showOnlyPercent": false,
  "clientNote": "",
  "expiryDate": "2023-08-01T00:00:00.000Z",
  "branding": {
    "showLogo": true,
    "primaryColor": "#FF0066",
    "companyName": "Shopmium Insights"
  },
  "filters": {
    "selectedProducts": ["all"],
    "selectedRetailers": ["all"],
    "dateRange": "all",
    "startDate": "",
    "endDate": "",
    "selectedMonth": ""
  },
  "customExcludedDates": [],
  "hiddenCharts": [],
  "precomputedData": {
    "metrics": {},
    "retailerData": [],
    "productDistribution": [],
    "brandMapping": {},
    "brandNames": [],
    "clientName": "Client",
    "filteredData": []
  },
  "metadata": {
    "createdAt": "2023-07-01T00:00:00.000Z",
    "brandNames": [],
    "clientName": "Client",
    "datasetSize": 1000
  }
}
```
