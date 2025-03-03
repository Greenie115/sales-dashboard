// src/components/dashboard/export/ExportButton.js
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../../context/DataContext';
import { exportToCSV, exportToPDF } from '../../../utils/exportUtils';

const ExportButton = ({ activeTab, tabData }) => {
  const { 
    brandNames, 
    clientName 
  } = useData();
  
  const [showOptions, setShowOptions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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
  
  // Create filename with current date
  const createFileName = () => {
    const brandText = brandNames?.length > 0 
      ? brandNames.join('-')  
      : clientName || 'Sales-Dashboard';
    
    // Format today's date as YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    // Create the filename
    let fileName = `${brandText}-${activeTab}-${today}`;
    
    // Sanitize the filename
    fileName = fileName.replace(/[\\/:*?"<>|]/g, '-');
    
    return fileName;
  };
  
  // Handle export action
  const handleExport = (type) => {
    setIsExporting(true);
    
    try {
      const fileName = createFileName();
      
      // Export data based on the selected format
      if (type === 'csv') {
        exportToCSV(tabData, activeTab, fileName);
      } else if (type === 'pdf') {
        exportToPDF(tabData, activeTab, fileName);
      }
      
      setIsExporting(false);
      setShowOptions(false);
    } catch (error) {
      console.error(`Error exporting to ${type.toUpperCase()}:`, error);
      setIsExporting(false);
      alert(`An error occurred while exporting to ${type.toUpperCase()}`);
    }
  };
  
  return (
    <div className="relative export-dropdown" ref={dropdownRef}>
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