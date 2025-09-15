// src/components/dashboard/export/ExportButton.js
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../../context/DataContext';
import { useFilter } from '../../../context/FilterContext';
import { exportToCSV, exportToPDF, getComparisonDataForExport } from '../../../utils/exportUtils';

const ExportButton = ({ activeTab, tabData }) => {
  const { 
    brandNames, 
    clientName,
    campaigns,
    comparisonSettings,
    canCompare
  } = useData();
  
  const { filters: filterState } = useFilter();
  
  const [showOptions, setShowOptions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Create smart filename with current date and filters
  const createFileName = () => {
    const brandText = brandNames?.length > 0 
      ? brandNames.join('-')  
      : clientName || 'Sales-Dashboard';
    
    // Format today's date as YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    // Add comparison context if applicable
    const comparisonText = comparisonSettings?.mode === 'campaigns' && canCompare 
      ? '-Campaign-Comparison' 
      : '';
    
    // Add filter context for more descriptive names
    const filterText = filterState ? (() => {
      const parts = [];
      if (filterState.dateRange === 'month' && filterState.selectedMonth) {
        parts.push(filterState.selectedMonth);
      } else if (filterState.dateRange === 'custom' && filterState.startDate && filterState.endDate) {
        parts.push(`${filterState.startDate}-to-${filterState.endDate}`);
      }
      if (!filterState.selectedProducts?.includes('all') && filterState.selectedProducts?.length > 0) {
        parts.push(`${filterState.selectedProducts.length}products`);
      }
      if (!filterState.selectedRetailers?.includes('all') && filterState.selectedRetailers?.length > 0) {
        parts.push(`${filterState.selectedRetailers.length}retailers`);
      }
      return parts.length > 0 ? '-' + parts.join('-') : '';
    })() : '';
    
    // Create the filename
    let fileName = `${brandText}-${activeTab}${comparisonText}${filterText}-${today}`;
    
    // Sanitize the filename
    fileName = fileName.replace(/[\\/:*?"<>|]/g, '-').replace(/-+/g, '-');
    
    return fileName;
  };
  
  // Handle export action
  const handleExport = async (type) => {
    setIsExporting(true);
    
    try {
      const fileName = createFileName();
      
      // Create comparison context if we're in comparison mode
      let comparisonContext = null;
      if (comparisonSettings?.mode === 'campaigns' && canCompare && campaigns) {
        const primaryDataset = comparisonSettings.primaryDataset || 'A';
        const comparisonDataset = primaryDataset === 'A' ? 'B' : 'A';
        
        // Get the processed comparison data
        const processedComparisonData = getComparisonDataForExport(
          campaigns, 
          comparisonSettings, 
          filterState, 
          activeTab
        );
        
        comparisonContext = {
          isComparison: true,
          primaryName: campaigns[primaryDataset]?.name || `Campaign ${primaryDataset}`,
          comparisonName: campaigns[comparisonDataset]?.name || `Campaign ${comparisonDataset}`,
          comparisonData: processedComparisonData
        };
      }
      
      // Export data based on the selected format
      if (type === 'csv') {
        await exportToCSV(tabData, activeTab, fileName, comparisonContext);
      } else if (type === 'pdf') {
        await exportToPDF(tabData, activeTab, fileName, comparisonContext);
      }
      
      setIsExporting(false);
      setShowOptions(false);
      
      // Show success feedback
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error(`Error exporting to ${type.toUpperCase()}:`, error);
      setIsExporting(false);
      alert(`An error occurred while exporting to ${type.toUpperCase()}: ${error.message}`);
    }
  };
  
  return (
    <div className="relative export-dropdown" ref={dropdownRef}>
      {/* Success feedback */}
      {showSuccess && (
        <div className="absolute -top-12 right-0 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-2 rounded-md text-sm font-medium shadow-lg border border-green-200 dark:border-green-800 z-30 flex items-center">
          <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Export completed!
        </div>
      )}
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={isExporting}
        className={`${
          isExporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-700'
        } px-4 py-2 rounded-md text-sm font-medium text-white flex items-center transition-colors duration-150`}
      >
        {isExporting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </>
        )}
      </button>
      
      {showOptions && !isExporting && (
        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md z-20 border border-gray-200">
          <button
            onClick={() => handleExport('csv')}
            className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
          >
            <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center border-t border-gray-100"
          >
            <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Export to PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;