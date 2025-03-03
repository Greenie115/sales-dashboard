// src/utils/exportUtils.js
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { createProductRetailerMatrix } from './dataProcessing';

// Format date to DD/MM/YYYY
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return dateString;
  }
};

// Format month for display (e.g., "2023-01" to "January 2023")
export const formatMonth = (monthStr) => {
  try {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  } catch (e) {
    return monthStr;
  }
};

// The preferred sorting order for age groups
export const AGE_GROUP_ORDER = [
  '16-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
  'Under 18'
];

/**
 * Export data to CSV
 */
export const exportToCSV = (data, activeTab, fileName) => {
  try {
    // Determine which data to export based on active tab
    if (activeTab === 'summary' || activeTab === 'sales') {
      // Export sales data
      exportSalesDataToCSV(data, fileName);
    } else if (activeTab === 'demographics') {
      // Export demographic data
      exportDemographicDataToCSV(data, fileName);
    } else if (activeTab === 'offers') {
      // Export offer data
      exportOfferDataToCSV(data, fileName);
    } else {
      throw new Error(`Unsupported tab type: ${activeTab}`);
    }
  } catch (error) {
    console.error('Error exporting CSV:', error);
    alert('Failed to export CSV. Check console for details.');
  }
};

/**
 * Export sales data to CSV
 */
const exportSalesDataToCSV = (data, fileName) => {
  // Extract what we need from the data object
  const { filteredData, retailerData, brandMapping } = data;
  
  // Create a product-retailer matrix for export
  const productRetailerMatrix = createProductRetailerMatrix(filteredData);
  
  if (!productRetailerMatrix) {
    alert('No valid data to export.');
    return;
  }
  
  // Begin building CSV content
  let csvContent = '';
  
  // Get the retailer headers
  const retailerHeaders = ['Product Name', ...productRetailerMatrix.retailers, 'Total'];
  csvContent = retailerHeaders.join(',') + '\n';
  
  // Add product rows
  productRetailerMatrix.products.forEach((product) => {
    const productRow = [product];
    
    // Add counts for each retailer
    productRetailerMatrix.retailers.forEach(retailer => {
      const count = productRetailerMatrix.data[product]?.[retailer] || 0;
      productRow.push(count);
    });
    
    // Add total for this product
    productRow.push(productRetailerMatrix.productTotals[product] || 0);
    
    // Format row and add to CSV
    const formattedRow = productRow.map(value => {
      if (value === null || value === undefined) return '';
      // Escape quotes and wrap in quotes if contains comma
      let stringValue = String(value).replace(/"/g, '""');
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        stringValue = `"${stringValue}"`;
      }
      return stringValue;
    });
    
    csvContent += formattedRow.join(',') + '\n';
  });
  
  // Add totals row
  const totalsRow = ['Total'];
  productRetailerMatrix.retailers.forEach(retailer => {
    totalsRow.push(productRetailerMatrix.retailerTotals[retailer] || 0);
  });
  totalsRow.push(productRetailerMatrix.grandTotal || 0);
  
  const formattedTotalsRow = totalsRow.map(value => {
    if (value === null || value === undefined) return '';
    let stringValue = String(value).replace(/"/g, '""');
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      stringValue = `"${stringValue}"`;
    }
    return stringValue;
  });
  
  csvContent += formattedTotalsRow.join(',') + '\n';
  
  // Add additional summary data - retailer distribution
  csvContent += '\n"Retailer Distribution"\n';
  csvContent += 'Retailer,Units,Percentage\n';
  
  retailerData.forEach(item => {
    const row = [
      `"${item.name}"`,
      item.value,
      `${item.percentage.toFixed(1)}%`
    ];
    csvContent += row.join(',') + '\n';
  });
  
  // Create and download the CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${fileName}.csv`);
};

/**
 * Export demographic data to CSV
 */
const exportDemographicDataToCSV = (data, fileName) => {
  // Check if we have demographic data to export
  if (!data || !data.ageData || data.ageData.length === 0) {
    alert('No demographic data available to export.');
    return;
  }
  
  let csvContent = '';
  
  // Export age distribution data
  const headers = ['age_group', 'count', 'percentage'];
  csvContent = headers.join(',') + '\n';
  
  // Sort by defined age group order if available
  const sortedAgeData = [...data.ageData].sort((a, b) => {
    const aIndex = AGE_GROUP_ORDER.indexOf(a.name);
    const bIndex = AGE_GROUP_ORDER.indexOf(b.name);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
  
  sortedAgeData.forEach(item => {
    csvContent += `${item.name},${item.value},${item.percentage.toFixed(1)}\n`;
  });
  
  // Add a spacer row and gender data
  if (data.genderData && data.genderData.length > 0) {
    csvContent += '\n"Gender Distribution"\n';
    csvContent += 'gender,count,percentage\n';
    
    data.genderData.forEach(item => {
      csvContent += `${item.name},${item.value},${item.percentage.toFixed(1)}\n`;
    });
  }
  
  // Add response data if available
  if (data.responseData && data.responseData.length > 0) {
    csvContent += '\n"Response Distribution"\n';
    csvContent += 'response,count,percentage\n';
    
    data.responseData.forEach(item => {
      const formattedResponse = `"${item.response.replace(/"/g, '""')}"`;
      csvContent += `${formattedResponse},${item.total},${item.percentage.toFixed(1)}\n`;
    });
    
    // Add selected response age distributions if available
    if (data.ageDistribution && data.ageDistribution.length > 0 && 
        data.selectedResponses && data.selectedResponses.length > 0) {
      
      csvContent += '\n"Age Distribution by Response"\n';
      
      // Create header row with all selected responses
      const ageHeaders = ['Age Group', 'Total Count', ...data.selectedResponses.flatMap(resp => 
        [`"${resp.replace(/"/g, '""')}"`, '% of Age Group', '% of Response']
      )];
      csvContent += ageHeaders.join(',') + '\n';
      
      // Add data rows
      data.ageDistribution.forEach(row => {
        const rowData = [row.ageGroup, row.count];
        
        data.selectedResponses.forEach(response => {
          rowData.push(
            row[response] || 0,
            row[`${response}_percent`] ? `${row[`${response}_percent`].toFixed(1)}%` : '0.0%',
            row[`${response}_percent_of_total`] ? `${row[`${response}_percent_of_total`].toFixed(1)}%` : '0.0%'
          );
        });
        
        csvContent += rowData.join(',') + '\n';
      });
    }
  }
  
  // Create and download the CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${fileName}.csv`);
};