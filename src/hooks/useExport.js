// src/hooks/useExport.js
import { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';

/**
 * Hook for exporting data to different formats
 * 
 * @returns {Object} Export methods and state
 */
export const useExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  
  /**
   * Generate a filename with current date
   * 
   * @param {string} baseName - Base filename
   * @param {string} format - File format extension
   * @returns {string} Formatted filename with date
   */
  const generateFilename = useCallback((baseName = 'export', format = 'csv') => {
    const date = new Date().toISOString().split('T')[0];
    return `${baseName}_${date}.${format}`;
  }, []);
  
  /**
   * Export data to CSV file
   * 
   * @param {Array|Object} data - Data to export
   * @param {string} filename - Filename without extension
   * @param {Object} options - CSV export options
   * @returns {Promise} Promise resolving to success status
   */
  const exportToCSV = useCallback(async (data, filename = 'export', options = {}) => {
    if (!data) {
      setExportError('No data to export');
      return false;
    }
    
    setIsExporting(true);
    setExportError(null);
    
    try {
      let csvContent;
      
      // Handle different data structures
      if (Array.isArray(data)) {
        // Array of objects - standard data format
        csvContent = Papa.unparse(data, {
          delimiter: ',',
          header: true,
          ...options
        });
      } else if (typeof data === 'object' && data !== null) {
        // Complex data object with multiple sections
        csvContent = '';
        
        // Handle flat objects
        if (!data.sections && !data.metrics && !data.summary) {
          csvContent = Papa.unparse([data], {
            delimiter: ',',
            header: true,
            ...options
          });
        } else {
          // Handle structured export data
          
          // Add title if provided
          if (data.title) {
            csvContent += `${data.title}\n\n`;
          }
          
          // Add metrics/summary section
          if (data.metrics || data.summary) {
            const metrics = data.metrics || data.summary || {};
            
            csvContent += 'Summary Metrics\n';
            Object.entries(metrics).forEach(([key, value]) => {
              csvContent += `${key},${value}\n`;
            });
            csvContent += '\n';
          }
          
          // Add sections if available
          if (data.sections && Array.isArray(data.sections)) {
            data.sections.forEach(section => {
              if (section.title) {
                csvContent += `${section.title}\n`;
              }
              
              if (section.data && Array.isArray(section.data)) {
                const sectionCsv = Papa.unparse(section.data, {
                  delimiter: ',',
                  header: true,
                  ...options
                });
                
                csvContent += sectionCsv + '\n\n';
              }
            });
          } else if (data.data && Array.isArray(data.data)) {
            // Handle simple data array with title
            const mainDataCsv = Papa.unparse(data.data, {
              delimiter: ',',
              header: true,
              ...options
            });
            
            csvContent += mainDataCsv;
          }
        }
      } else {
        throw new Error('Unsupported data format');
      }
      
      // Create and download the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, generateFilename(filename, 'csv'));
      
      setIsExporting(false);
      return true;
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      setExportError('Failed to export data to CSV');
      setIsExporting(false);
      return false;
    }
  }, [generateFilename]);
  
  /**
   * Export data to JSON file
   * 
   * @param {any} data - Data to export
   * @param {string} filename - Filename without extension
   * @returns {Promise} Promise resolving to success status
   */
  const exportToJSON = useCallback(async (data, filename = 'export') => {
    if (!data) {
      setExportError('No data to export');
      return false;
    }
    
    setIsExporting(true);
    setExportError(null);
    
    try {
      // Convert data to JSON
      const jsonContent = JSON.stringify(data, null, 2);
      
      // Create and download the JSON file
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      saveAs(blob, generateFilename(filename, 'json'));
      
      setIsExporting(false);
      return true;
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      setExportError('Failed to export data to JSON');
      setIsExporting(false);
      return false;
    }
  }, [generateFilename]);
  
  /**
   * Create a structured export object from different data sources
   * 
   * @param {Object} params - Configuration for export
   * @returns {Object} Structured export data
   */
  const createExportData = useCallback(({
    title,
    metrics = {},
    retailerData = [],
    productData = [],
    timeSeriesData = [],
    otherData = {}
  }) => {
    const exportData = {
      title,
      metrics,
      sections: []
    };
    
    // Add retailer distribution if available
    if (retailerData && retailerData.length > 0) {
      exportData.sections.push({
        title: 'Retailer Distribution',
        data: retailerData
      });
    }
    
    // Add product distribution if available
    if (productData && productData.length > 0) {
      exportData.sections.push({
        title: 'Product Distribution',
        data: productData
      });
    }
    
    // Add time series data if available
    if (timeSeriesData && timeSeriesData.length > 0) {
      exportData.sections.push({
        title: 'Time Series Data',
        data: timeSeriesData
      });
    }
    
    // Add any other data
    if (otherData && Object.keys(otherData).length > 0) {
      // Handle object or array formats
      if (Array.isArray(otherData)) {
        exportData.sections.push({
          title: 'Additional Data',
          data: otherData
        });
      } else {
        // Create a section for each key
        Object.entries(otherData).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            exportData.sections.push({
              title: key,
              data: value
            });
          }
        });
      }
    }
    
    return exportData;
  }, []);
  
  return {
    isExporting,
    exportError,
    exportToCSV,
    exportToJSON,
    generateFilename,
    createExportData,
    setExportError
  };
};