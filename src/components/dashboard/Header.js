// src/components/dashboard/Header.js
import React from 'react';
import { useData } from '../../context/DataContext';
import ThemeToggle from '../ThemeToggle';
import logo from '../../assets/unnamed-ezgif.com-webp-to-jpg-converter.jpg';

const Header = () => {
  
  // Get data context for status display
  const { 
    campaigns,
    clientName,
    hasData,
    salesData,
    canCompare,
    comparisonSettings,
    clearData
  } = useData();
  
  // Calculate record count
  const recordCount = salesData?.length || 0;
  const campaignACount = campaigns?.A?.data?.length || 0;
  const campaignBCount = campaigns?.B?.data?.length || 0;
  
  // Get campaign names for display
  const campaignAName = campaigns?.A?.name || 'Campaign A';
  const campaignBName = campaigns?.B?.name || 'Campaign B';
  
  
  // Clear all data with confirmation
  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      clearData();
    }
  };




  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
          <div className="flex-shrink-0 flex items-center">
            <img 
              src={logo} 
              className="w-12 h-12 rounded-lg"
              alt="Logo"
            />
            <div className="ml-2">
              <span className="text-xl font-semibold text-gray-900 dark:text-white">Sales Insights Dashboard</span>
              {clientName && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {clientName}
                </div>
              )}
            </div>
          </div>
        </div>
          
          {/* Actions and user menu */}
          <div className="flex items-center">
            {/* Dark mode toggle */}
            <div className="mr-4">
              <ThemeToggle />
            </div>
            
            {/* Show enhanced data status */}
            {hasData ? (
              <div className="mr-4 text-sm text-green-600 dark:text-green-400 font-medium hidden md:block">
                <div className="flex items-center space-x-2">
                  <span className="flex items-center">
                    <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Data loaded
                  </span>
                  {comparisonSettings?.mode === 'campaigns' && canCompare ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({campaignAName}: {campaignACount.toLocaleString()}, {campaignBName}: {campaignBCount.toLocaleString()})
                    </span>
                  ) : recordCount > 0 ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({recordCount.toLocaleString()} records)
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <span className="mr-4 text-sm text-gray-500 dark:text-gray-400 font-medium hidden md:block flex items-center">
                <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                No data loaded
              </span>
            )}
            
            {/* Clear data button */}
            {hasData && (
              <button
                onClick={handleClearAllData}
                className="px-3 py-1 rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors"
                title="Clear all data"
              >
                <svg className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Data
              </button>
            )}
          </div>
        </div>
      </div>
      
    </header>
  );
};

export default Header;
