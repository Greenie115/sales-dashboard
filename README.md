# Sales Dashboard

A comprehensive sales data visualization dashboard with client sharing capabilities. This application allows you to upload, analyze, and share sales data with clients in a secure and customizable way.

## Features

- Upload and analyze sales data from CSV files
- View sales metrics, trends, and distributions
- Filter data by products, retailers, and date ranges
- Share customized dashboard views with clients
- Control what data and visualizations clients can see
- Dark/light mode support

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account (for data sharing functionality)

### Installation

Make sure you have Node.js installed, then run:

```bash
npm install
```

This will install all dependencies, including React Router DOM which is required for the sharing feature.

### Supabase Setup (for Sharing Functionality)

1. Create a Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and anon key from the Supabase dashboard
4. Create a `.env` file in the root directory based on `.env.example`
5. Add your Supabase URL and anon key to the `.env` file
6. Set up the database schema by following the instructions in `supabase/README.md`

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Data Sharing Functionality

This dashboard includes powerful data sharing capabilities that allow you to share insights with clients while maintaining control over what data is visible.

### How to Share Data

1. Upload and analyze your sales data
2. Click the "Share" button in the dashboard header
3. Configure your sharing options:
   - Select which tabs to include (Summary, Sales, Demographics, Offers)
   - Choose whether to hide retailer names for confidentiality
   - Set whether to hide total values or show only percentages
   - Add client notes
   - Set an expiration date for the shared link
4. Click "Generate Link" to create a shareable URL
5. Copy and send the link to your client

### Data Privacy and Security

When sharing data with clients, you can:

- Anonymize retailer names to protect sensitive business relationships
- Hide absolute values and show only percentages
- Limit which dashboard tabs are accessible
- Set expiration dates for shared links
- Hide specific charts that contain sensitive information

### Troubleshooting Sharing Issues

If you're having trouble with the sharing functionality:

1. Check that your Supabase credentials are correct in the `.env` file
2. Verify that the `shared_dashboards` table exists in your Supabase database
3. Check the browser console for any error messages
4. Try reducing the amount of data being shared if you're getting timeout errors

## Data Format

### Sales Data CSV Format

The application expects CSV files with the following columns:
- `receipt_date`: Date of the transaction (YYYY-MM-DD format)
- `product_name`: Name of the product
- `chain`: Retailer/chain name
- Additional columns are supported but not required

### Offer Data CSV Format

For offer data, the CSV should include:
- `hit_id`: Unique identifier for the offer hit
- Additional columns as needed
