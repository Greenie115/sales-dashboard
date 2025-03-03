// src/components/dashboard/export/ExportButton.js
import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../../../context/DashboardContext';
import { exportToCSV } from '../../../utils/exportUtils';

const ExportButton = ({ activeTab }) => {
  const { state } = useDashboard();
  const [showOptions, setShowOptions] = useState(false);
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
  
  // Handle export action
  const handleExport = (type) => {
    // Get export data based on active tab
    let exportData;
    
    if (activeTab === 'summary' || activeTab === 'sales') {
      exportData = {
        filteredData: state.filteredData,
        retailerData: state.metrics?.retailerData,
        brandMapping: state.brandInfo.brandMapping
      };
    } else if (activeTab === 'demographics') {
      exportData = state.exportData?.demographicData || {};
    } else if (activeTab === 'offers') {
      exportData = state.exportData?.offerData || {};
    }
    
    // Create filename
    const brandName = state.brandInfo.brandNames.length > 0 
      ? state.brandInfo.brandNames.join(', ')  
      : state.clientName || 'Shopmium';
    
    // Format today's date as YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    // Create the filename
    let fileName = `${brandName} Shopmium Analysis ${today}`;
    
    // Sanitize the filename
    fileName = fileName.replace(/[\\/:*?"<>|]/g, '-');
    
    if (type === 'csv') {
      exportToCSV(exportData, activeTab, fileName);
    } else if (type === 'pdf') {
      // PDF export functionality would go here
      alert('PDF export coming soon!');
    }
    
    // Close export options dropdown
    setShowOptions(false);
  };
  
  return (
    <div className="relative export-dropdown" ref={dropdownRef}>
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="bg-pink-600 px-4 py-2 rounded-md text-sm font-medium text-white hover:bg-pink-700 flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export
      </button>
      
      {showOptions && (
        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md z-10">
          <button
            onClick={() => handleExport('csv')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            Export to CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            Export to PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;