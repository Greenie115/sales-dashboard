// src/components/filters/FilterPanel.js
import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useFilter } from '../../context/FilterContext';
import { getCombinedCampaignData, getUniqueProducts, getUniqueRetailers } from '../../utils/campaignUtils';
import { InfoTooltip, HelpTooltip } from '../common/Tooltip';

/**
 * FilterPanel component for filtering data across all tabs
 */
const FilterPanel = ({ activeTab }) => {
  // Get data-related state from DataContext
  const {
    salesData,
    hasData,
    dataLoading,
    campaigns,
    comparisonSettings,
    canCompare
  } = useData();

  // Get filter-related state and functions from FilterContext
  const {
    selectedProducts = ['all'],
    selectedRetailers = ['all'],
    dateRange = 'all',
    startDate = '',
    endDate = '',
    selectedMonth = '',
    setDateRange,
    setStartDate,
    setEndDate,
    setSelectedMonth,
    comparisonMode = false,
    setComparisonMode,
    comparisonDateRange = 'custom',
    comparisonStartDate = '',
    comparisonEndDate = '',
    comparisonMonth = '',
    setComparisonDateRange,
    setComparisonStartDate,
    setComparisonEndDate,
    setComparisonMonth,
    handleProductSelection,
    handleRetailerSelection,
    getAvailableMonths,
    formatMonth
  } = useFilter();

  // Local state for UI
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSection, setExpandedSection] = useState('all');

  // Toggle a specific section or all sections
  const toggleSection = (section) => {
    if (expandedSection === section) {
      setExpandedSection('all');
    } else {
      setExpandedSection(section);
    }
  };


  // Get the data source for filters (either combined or single campaign) - memoized
  const filterDataSource = useMemo(() => getCombinedCampaignData({
    campaigns,
    comparisonSettings,
    canCompare,
    fallbackData: salesData
  }), [campaigns, comparisonSettings, canCompare, salesData]);

  // Available retailers from data (combined when in comparison mode) - memoized
  const availableRetailers = useMemo(() => getUniqueRetailers(filterDataSource), [filterDataSource]);

  // Available products from data (combined when in comparison mode) - memoized
  const availableProducts = useMemo(() => getUniqueProducts(filterDataSource), [filterDataSource]);

  // If no data is available, don't show the filter panel
  if (!hasData && !dataLoading) {
    return null;
  }

  // Show skeleton loading state when data is loading
  if (dataLoading && !hasData) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
          <div className="flex items-center">
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
            <div className="ml-4 h-4 w-32 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
          </div>
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center space-x-2">
                      <div className="h-4 w-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200">
      {/* Header with expand/collapse */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Filters</h2>
          <InfoTooltip 
            content="Filter your data by products, retailers, and date ranges to focus on specific insights. Changes apply to all charts and metrics." 
            className="ml-2"
          />
          <div className="ml-3 flex flex-wrap items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
              {selectedProducts.includes('all') ? 'All Products' : `${selectedProducts.length} Products`}
            </span>
            <span className="text-sm text-gray-400 dark:text-gray-500 mx-1">•</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
              {selectedRetailers.includes('all') ? 'All Retailers' : `${selectedRetailers.length} Retailers`}
            </span>
            <span className="text-sm text-gray-400 dark:text-gray-500 mx-1">•</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {dateRange === 'all' ? 'All Time' :
               dateRange === 'month' ? `Month: ${formatMonth(selectedMonth)}` :
               `${startDate} to ${endDate}`}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          {setComparisonMode && (
            <HelpTooltip content="Enable time period comparison to analyze trends and changes over different date ranges">
              <button
                onClick={() => setComparisonMode(!comparisonMode)}
                className={`mr-3 px-3 py-1 text-sm rounded-md transition-colors ${
                  comparisonMode
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/30'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                }`}
              >
                {comparisonMode ? '✓ Comparison On' : 'Compare Periods'}
              </button>
            </HelpTooltip>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
            aria-label={isCollapsed ? "Expand filter panel" : "Collapse filter panel"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 transition-transform duration-200 ${isCollapsed ? '' : 'transform rotate-180'}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter content */}
      <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[2000px]'}`}>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Product filter section */}
            <div>
              <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => toggleSection('products')}>
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Products</h3>
                  <HelpTooltip 
                    content="Filter by specific products to analyze their individual performance and trends" 
                    className="ml-1"
                  />
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${expandedSection === 'products' || expandedSection === 'all' ? 'transform rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>

              <div className={`transition-all duration-300 overflow-hidden ${expandedSection === 'products' || expandedSection === 'all' ? 'max-h-80' : 'max-h-0'}`}>
                <div className="flex flex-wrap gap-2 mt-2 max-h-72 overflow-y-auto">
                  <button
                    onClick={() => handleProductSelection('all')}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                      selectedProducts.includes('all')
                        ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-800/30'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>All</span>
                    {!selectedProducts.includes('all') && (
                      <svg className="ml-1 h-3 w-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                  </button>

                  {availableProducts.map(product => (
                    <button
                      key={product}
                      onClick={() => handleProductSelection(product)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                        selectedProducts.includes(product) && !selectedProducts.includes('all')
                          ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-800/30'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span>{product.length > 20 ? `${product.substring(0, 20)}...` : product}</span>
                      {selectedProducts.includes(product) && !selectedProducts.includes('all') ? (
                        <svg className="ml-1 h-3 w-3 text-pink-600 dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="ml-1 h-3 w-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Retailer filter section */}
            <div>
              <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => toggleSection('retailers')}>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Retailers</h3>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${expandedSection === 'retailers' || expandedSection === 'all' ? 'transform rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>

              <div className={`transition-all duration-300 overflow-hidden ${expandedSection === 'retailers' || expandedSection === 'all' ? 'max-h-80' : 'max-h-0'}`}>
                <div className="flex flex-wrap gap-2 mt-2 max-h-72 overflow-y-auto">
                  <button
                    onClick={() => handleRetailerSelection('all')}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                      selectedRetailers.includes('all')
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/30'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>All</span>
                    {!selectedRetailers.includes('all') && (
                      <svg className="ml-1 h-3 w-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                  </button>

                  {availableRetailers.map(retailer => (
                    <button
                      key={retailer}
                      onClick={() => handleRetailerSelection(retailer)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                        selectedRetailers.includes(retailer) && !selectedRetailers.includes('all')
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/30'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span>{retailer}</span>
                      {selectedRetailers.includes(retailer) && !selectedRetailers.includes('all') ? (
                        <svg className="ml-1 h-3 w-3 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="ml-1 h-3 w-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Date Range filter section */}
            <div>
              <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => toggleSection('dates')}>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</h3>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${expandedSection === 'dates' || expandedSection === 'all' ? 'transform rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>

              <div className={`transition-all duration-300 overflow-hidden ${expandedSection === 'dates' || expandedSection === 'all' ? 'max-h-96' : 'max-h-0'}`}>
                {/* Primary date range */}
                <div className={`p-3 rounded-md ${comparisonMode ? "bg-pink-50 dark:bg-pink-900/20 mb-3" : ""}`}>
                  {comparisonMode && (
                    <div className="text-xs font-medium text-pink-700 dark:text-pink-400 mb-2 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                      </svg>
                      Primary Period
                    </div>
                  )}

                  {setDateRange && (
                    <div className="flex gap-2 flex-wrap mb-2">
                      <button
                        onClick={() => setDateRange('all')}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          dateRange === 'all'
                            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/30'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        All Dates
                      </button>

                      <button
                        onClick={() => setDateRange('month')}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          dateRange === 'month'
                            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/30'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        By Month
                      </button>

                      <button
                        onClick={() => setDateRange('custom')}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          dateRange === 'custom'
                            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/30'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Custom
                      </button>
                    </div>
                  )}

                  {dateRange === 'month' && setSelectedMonth && (
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="block w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white outline-none"
                    >
                      <option value="">Select Month</option>
                      {getAvailableMonths().map(month => (
                        <option key={month} value={month}>{formatMonth(month)}</option>
                      ))}
                    </select>
                  )}

                  {dateRange === 'custom' && setStartDate && setEndDate && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="block w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="block w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Comparison mode toggle */}
                {setComparisonMode && (
                  <div className="flex items-center mt-2 mb-3">
                    <div className="form-control">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={comparisonMode}
                          onChange={(e) => setComparisonMode(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`relative w-10 h-5 transition duration-200 ease-linear rounded-full ${comparisonMode ? 'bg-blue-400 dark:bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                          <div className={`absolute left-0 w-5 h-5 transition duration-200 ease-linear transform bg-white dark:bg-gray-200 rounded-full ${comparisonMode ? 'translate-x-full border-blue-400 dark:border-blue-600' : 'translate-x-0 border-gray-300 dark:border-gray-600'} border`}></div>
                        </div>
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Compare periods</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Comparison period controls */}
                {comparisonMode && (
                  <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20">
                    <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                      </svg>
                      Comparison Period
                    </div>

                    {/* Comparison Date Range Buttons */}
                    <div className="flex gap-2 flex-wrap mb-3">
                      <button
                        onClick={() => setComparisonDateRange('previous')}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          comparisonDateRange === 'previous'
                            ? 'bg-blue-200 dark:bg-blue-800/40 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700/50'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Previous Period
                      </button>
                      <button
                        onClick={() => setComparisonDateRange('month')}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          comparisonDateRange === 'month'
                            ? 'bg-blue-200 dark:bg-blue-800/40 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700/50'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Compare Month
                      </button>
                      <button
                        onClick={() => setComparisonDateRange('custom')}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          comparisonDateRange === 'custom'
                            ? 'bg-blue-200 dark:bg-blue-800/40 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700/50'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Custom Dates
                      </button>
                    </div>

                    {/* Comparison Month Selector */}
                    {comparisonDateRange === 'month' && (
                      <select
                        value={comparisonMonth}
                        onChange={(e) => setComparisonMonth(e.target.value)}
                        className="block w-full p-2 text-sm border border-blue-300 dark:border-blue-600/50 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white outline-none mb-2"
                      >
                        <option value="">Select Comparison Month</option>
                        {getAvailableMonths().map(month => (
                          <option key={month} value={month}>{formatMonth(month)}</option>
                        ))}
                      </select>
                    )}

                    {/* Custom Date Range Inputs */}
                    {comparisonDateRange === 'custom' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-blue-600 dark:text-blue-400 mb-1 font-medium">From</label>
                          <input
                            type="date"
                            value={comparisonStartDate}
                            onChange={(e) => setComparisonStartDate(e.target.value)}
                            className="block w-full p-2 text-sm border border-blue-300 dark:border-blue-600/50 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-blue-600 dark:text-blue-400 mb-1 font-medium">To</label>
                          <input
                            type="date"
                            value={comparisonEndDate}
                            onChange={(e) => setComparisonEndDate(e.target.value)}
                            className="block w-full p-2 text-sm border border-blue-300 dark:border-blue-600/50 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Auto Previous Period Info */}
                    {comparisonDateRange === 'previous' && (
                      <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                          </svg>
                          Automatically compares to previous equivalent period
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active filters summary */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              {!selectedProducts.includes('all') && selectedProducts.map(product => (
                <div key={product} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300">
                  <span>Product: {product.length > 15 ? `${product.substring(0, 15)}...` : product}</span>
                  <button
                    onClick={() => handleProductSelection(product)}
                    className="ml-1 text-pink-600 dark:text-pink-400 hover:text-pink-800 dark:hover:text-pink-200"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}

              {dateRange !== 'all' && setDateRange && (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300">
                  <span>
                    Date: {dateRange === 'month' ? formatMonth(selectedMonth) : `${startDate} to ${endDate}`}
                  </span>
                  <button
                    onClick={() => setDateRange('all')}
                    className="ml-1 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}

              {comparisonMode && setComparisonMode && (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                  <span>
                    Comparison: {
                      comparisonDateRange === 'previous' ? 'Previous Period' :
                      comparisonDateRange === 'month' ? formatMonth(comparisonMonth) :
                      `${comparisonStartDate} to ${comparisonEndDate}`
                    }
                  </span>
                  <button
                    onClick={() => setComparisonMode(false)}
                    className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;