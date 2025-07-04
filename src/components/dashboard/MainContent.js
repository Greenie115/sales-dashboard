import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useFilter } from '../../context/FilterContext';
import { useTheme } from '../../context/ThemeContext'; // Added ThemeContext import
import EmptyState from './EmptyState';
import SummaryTab from './tabs/SummaryTab';
import SalesTab from './tabs/SalesTab';
import DemographicsTab from './tabs/DemographicsTab';
import OffersTab from './tabs/OffersTab';
import FilterPanel from '../filters/FilterPanel';

/**
 * Main content area with tabs and data display
 */
const MainContent = () => {
  // Get data from DataContext
  const {
    salesData,
    offerData,
    hasOfferData,
    brandNames = [],
    clientName,
    hasData,
    loading,
    error,
    activeTab,
    setActiveTab
  } = useData();

  // Get filter-related functions from FilterContext
  const {
    calculateMetrics
  } = useFilter();

  // Get dark mode from ThemeContext
  const { darkMode } = useTheme();

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // If no data is loaded, show empty state
  if (!hasData) {
    return <EmptyState />;
  }

  // Explicitly check if offers tab should be available
  const isOffersTabAvailable = hasOfferData || (offerData && offerData.length > 0);

  // Calculate metrics for display
  const metrics = calculateMetrics ? calculateMetrics() : null;

  return (
    <div className="space-y-6">
      {/* Filter Panel - Appears on all tabs */}
      <FilterPanel activeTab={activeTab} />

      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
        {/* Tab navigation */}
        <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <nav className="flex -mb-px">
            <button
              onClick={() => handleTabChange('summary')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'summary'
                  ? `border-pink-500 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`
                  : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300 hover:border-gray-500' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => handleTabChange('sales')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'sales'
                  ? `border-pink-500 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`
                  : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300 hover:border-gray-500' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
              }`}
            >
              Sales Analysis
            </button>
            <button
              onClick={() => handleTabChange('demographics')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'demographics'
                  ? `border-pink-500 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`
                  : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300 hover:border-gray-500' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
              }`}
            >
              Demographics
            </button>
            {isOffersTabAvailable && (
              <button
                onClick={() => handleTabChange('offers')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'offers'
                    ? `border-pink-500 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`
                    : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300 hover:border-gray-500' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
                }`}
              >
                Offers
              </button>
            )}
          </nav>
        </div>
          {/* Brand information */}
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {activeTab === 'summary' && 'Executive Summary'}
                {activeTab === 'sales' && 'Sales Analysis'}
                {activeTab === 'demographics' && 'Demographics'}
                {activeTab === 'offers' && 'Offer Insights'}
              </h1>
              <div className={`mt-1 flex flex-wrap items-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {/* Show client name first if available */}
                {clientName && (
                  <>
                    <span className="mr-2">
                      Client: <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{clientName}</span>
                    </span>
                    <span className="mr-2 text-gray-300">•</span>
                  </>
                )}

                {/* Show brand names if available */}
                {Array.isArray(brandNames) && brandNames.length > 0 && (
                  <>
                    <span className="mr-2">
                      Brand: <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{brandNames.join(', ')}</span>
                    </span>
                    <span className="mr-2 text-gray-300">•</span>
                  </>
                )}

                {metrics && metrics.uniqueDates && metrics.uniqueDates.length > 0 && (
                  <span>
                    Date range: <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {metrics.uniqueDates[0]} to {metrics.uniqueDates[metrics.uniqueDates.length - 1]}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Display error if present */}
        {error && (
          <div className="bg-red-50 p-4 m-6 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'summary' && <SummaryTab />}
          {activeTab === 'sales' && <SalesTab />}
          {activeTab === 'demographics' && <DemographicsTab />}
          {activeTab === 'offers' && isOffersTabAvailable && <OffersTab />}
        </div>
      </div>
    </div>
  );
};

export default MainContent;