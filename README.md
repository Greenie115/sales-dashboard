# Sales Dashboard

A comprehensive sales data visualization dashboard for analyzing CSV sales data. This standalone application allows you to upload, analyze, and compare sales performance across multiple campaigns with advanced analytics and insights.

## Features

- Upload and analyze sales data from multiple CSV formats
- Compare performance between two campaigns (A vs B)
- Advanced date parsing supporting international formats (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
- Comprehensive sales metrics, trends, and distributions
- Repurchase intent analysis with intelligent brand detection
- Dynamic filtering by products, retailers, and date ranges
- Advanced demographics analysis with clickable product exploration
- Offer performance tracking and analysis
- Real-time data processing with progress indicators
- Error handling and recovery for robust data analysis

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

```bash
npm install
npm start
```

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

## Dashboard Tabs

### Summary Tab
- Key performance indicators and metrics overview
- Top performing products and retailers
- Repurchase intent analysis for all products
- Campaign comparison metrics when multiple datasets are loaded

### Sales Tab  
- Detailed sales performance analytics
- Revenue trends and distribution charts
- Product and retailer performance breakdowns
- Time-based sales analysis

### Demographics Tab
- Customer demographic insights and trends
- Interactive product exploration (click products to filter data)
- Geographic and demographic distribution analysis

### Offers Tab
- Offer performance tracking and analysis
- Campaign effectiveness metrics
- Offer hit analysis and optimization insights

## Data Format

### Supported CSV Formats

The dashboard automatically detects and processes various CSV formats:

#### Sales Data
- **Date columns**: Supports multiple formats (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, ISO timestamps)
- **Product identification**: Automatically detects product name columns
- **Retailer data**: Identifies chain/retailer information
- **Revenue data**: Processes sales amounts and pricing information
- **Flexible column mapping**: Automatically maps common column variations

#### Survey Data (Optional)
- **Repurchase intent**: Processes survey responses for repurchase likelihood
- **Customer feedback**: Analyzes satisfaction and intent data
- **Demographic information**: Age, location, and other customer attributes

#### Offer Data (Optional)
- **Campaign tracking**: Processes offer hit data and performance metrics
- **Engagement metrics**: Click-through rates and conversion data

### Data Processing Features

- **Automatic column detection**: Smart mapping of CSV columns to data types
- **Brand detection**: Intelligent identification of product brands and categories
- **Error recovery**: Robust handling of malformed data and missing values
- **Progress tracking**: Real-time processing updates with stage indicators
- **Memory optimization**: Efficient processing of large datasets
