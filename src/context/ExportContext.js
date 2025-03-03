import React, { createContext, useContext, useState } from 'react';
import _ from 'lodash'; // Add missing lodash import
import { saveAs } from 'file-saver';

// Create the context
const ExportContext = createContext();

// Custom hook to use the export context
export const useExport = () => useContext(ExportContext);

// Define the exportOfferDataToCSV function that was missing
const exportOfferDataToCSV = (offerData, fileName) => {
  if (!offerData) return;
  
  try {
    let csvContent = '';
    
    // Export offer metrics
    if (offerData.metrics) {
      csvContent = 'Offer Insights Summary\n';
      csvContent += `Total Hits,${offerData.metrics.totalHits.toLocaleString()}\n`;
      csvContent += `Period Length,${offerData.metrics.periodDays} days\n`;
      csvContent += `Average Hits Per Day,${offerData.metrics.averageHitsPerDay}\n\n`;
      
      // Export offer data
      if (offerData.offerData && offerData.offerData.length > 0) {
        csvContent += '"Offer Performance"\n';
        csvContent += 'Offer Name,Total Hits,Avg Hits/Day,Percentage\n';
        
        offerData.offerData.forEach(item => {
          const formattedOfferName = `"${item.name.replace(/"/g, '""')}"`;
          csvContent += `${formattedOfferName},${item.value},${item.averageHitsPerDay || 'N/A'},${item.percentage.toFixed(1)}\n`;
        });
        
        // Add gender data if available
        if (offerData.genderData && offerData.genderData.length > 0) {
          csvContent += '\n"Gender Distribution"\n';
          csvContent += 'Gender,Count,Percentage\n';
          
          offerData.genderData.forEach(item => {
            csvContent += `${item.name},${item.value},${item.percentage.toFixed(1)}\n`;
          });
        }
        
        // Add age data if available
        if (offerData.ageData && offerData.ageData.length > 0) {
          csvContent += '\n"Age Distribution"\n';
          csvContent += 'Age Group,Count,Percentage\n';
          
          offerData.ageData.forEach(item => {
            csvContent += `${item.name},${item.value},${item.percentage.toFixed(1)}\n`;
          });
        }
      }
    }
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${fileName}.csv`);
    
    return true;
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return false;
  }
};

// Create the ExportProvider component that was missing
export const ExportProvider = ({ children }) => {
  const [exportFormat, setExportFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);
  
  // Function to export data to CSV
  const exportToCSV = (data, fileName) => {
    if (!data) return false;
    
    setIsExporting(true);
    
    try {
      let csvContent = '';
      
      // Determine data type and export accordingly
      if (data.offerData) {
        // Export offer data
        return exportOfferDataToCSV(data, fileName);
      } else if (data.demographicData) {
        // Export demographic data
        csvContent = 'Demographic Data\n';
        
        // Export age data if available
        if (data.demographicData.ageData && data.demographicData.ageData.length > 0) {
          csvContent += 'Age Distribution\n';
          csvContent += 'Age Group,Count,Percentage\n';
          
          data.demographicData.ageData.forEach(item => {
            csvContent += `${item.name},${item.value},${item.percentage.toFixed(1)}\n`;
          });
        }
        
        // Export gender data if available
        if (data.demographicData.genderData && data.demographicData.genderData.length > 0) {
          csvContent += '\nGender Distribution\n';
          csvContent += 'Gender,Count,Percentage\n';
          
          data.demographicData.genderData.forEach(item => {
            csvContent += `${item.name},${item.value},${item.percentage.toFixed(1)}\n`;
          });
        }
      } else {
        // Export general sales data
        const headers = Object.keys(data[0] || {});
        csvContent = headers.join(',') + '\n';
        
        data.forEach(item => {
          const row = headers.map(header => {
            let value = item[header];
            if (value === null || value === undefined) value = '';
            value = String(value).replace(/"/g, '""');
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              value = `"${value}"`;
            }
            return value;
          });
          csvContent += row.join(',') + '\n';
        });
      }
      
      // Create and download the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${fileName}.csv`);
      
      setIsExporting(false);
      return true;
    } catch (error) {
      console.error('Error exporting CSV:', error);
      setIsExporting(false);
      return false;
    }
  };
  
  // Function to export data to PDF
  const exportToPDF = (data, fileName) => {
    setIsExporting(true);
    
    try {
      // PDF export implementation would go here
      // This is a placeholder for actual PDF generation logic
      console.log('PDF export for', fileName, 'with data', data);
      
      setIsExporting(false);
      return true;
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setIsExporting(false);
      return false;
    }
  };
  
  // Main export function that determines format
  const exportData = (data, fileName) => {
    if (exportFormat === 'csv') {
      return exportToCSV(data, fileName);
    } else if (exportFormat === 'pdf') {
      return exportToPDF(data, fileName);
    }
    return false;
  };
  
  // Value object to be provided to consumers
  const value = {
    exportFormat,
    setExportFormat,
    exportData,
    isExporting,
    exportToCSV,
    exportToPDF
  };
  
  return (
    <ExportContext.Provider value={value}>
      {children}
    </ExportContext.Provider>
  );
};

export default ExportContext;