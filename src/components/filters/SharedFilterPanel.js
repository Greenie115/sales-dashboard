// Add this component to src/components/filters/SharedFilterPanel.js

import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useBrandDetection } from '../../hooks/useBrandDetection';

/**
 * Simplified FilterPanel component for shared dashboard view
 */
const SharedFilterPanel = ({ 
  salesData, 
  selectedProducts,
  selectedRetailers,
  dateRange,
  startDate,
  endDate,
  selectedMonth,
  setSelectedProducts,
  setSelectedRetailers,
  setDateRange,
  setStartDate,
  setEndDate,
  setSelectedMonth,
  getAvailableMonths,
  brandMapping,
  allowClientFiltering = true // Control whether clients can filter
}) => {
  const { darkMode } = useTheme();
  const { getProductDisplayName } = useBrandDetection();
  
  // Local state for UI
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSection, setExpandedSection] = useState('all');
  
  // Toggle the filter panel
  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };
  
  // Toggle a specific section
  const toggleSection = (section) => {
    if (expandedSection === section) {
      setExpandedSection('all');
    } else {
      setExpandedSection(section);
    }
  };
  
  // Handle product selection
  const handleProductSelection = (product) => {
    if (!allowClientFiltering || !setSelectedProducts) return;
    
    if (product === 'all') {
      setSelectedProducts(['all']);
    } else {
      const newSelection = selectedProducts.includes('all')
        ? [product]
        : selectedProducts.includes(product)
          ? selectedProducts.filter(p => p !== product)
          : [...selectedProducts, product];
      
      setSelectedProducts(newSelection.length ? newSelection : ['all']);
    }
  };
  
  // Handle retailer selection
  const handleRetailerSelection = (retailer) => {
    if (!allowClientFiltering || !setSelectedRetailers) return;
    
    if (retailer === 'all') {
      setSelectedRetailers(['all']);
    } else {
      const newSelection = selectedRetailers.includes('all')
        ? [retailer]
        : selectedRetailers.includes(retailer)
          ? selectedRetailers.filter(r => r !== retailer)
          : [...selectedRetailers, retailer];
      
      setSelectedRetailers(newSelection.length ? newSelection : ['all']);
    }
  };
  
  // Get available retailers from data
  const availableRetailers = [...new Set(
    (salesData || [])
      .map(item => item.chain || '')
      .filter(Boolean)
  )].sort();
  
  // Get available products from data
  const availableProducts = [...new Set(
    (salesData || [])
      .map(item => item.product_name || '')
      .filter(Boolean)
  )].sort();
  
  // If filtering is disabled or no data, don't show the panel
  if (!allowClientFiltering || !salesData || salesData.length === 0) {
    return null;
  }
  
  return (
    <div className={`bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 mb-6`}>
      {/* Header with expand/collapse */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Filter Data</h2>
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
               dateRange === 'month' ? `Month: ${selectedMonth}` : 
               `${startDate} to ${endDate}`}
            </span>
          </div>
        </div>
        <button 
          onClick={toggleCollapse}
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
      
      {/* Filter content */}
      <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[2000px]'}`}>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Product filter section */}
            <div>
              <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => toggleSection('products')}>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Products</h3>
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
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => handleProductSelection('all')}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                      selectedProducts.includes('all')
                        ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-800/30'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>All</span>
                  </button>
                  
                  {availableProducts.slice(0, 20).map(product => (
                    <button
                      key={product}
                      onClick={() => handleProductSelection(product)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                        selectedProducts.includes(product) && !selectedProducts.includes('all')
                          ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-800/30'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span>{getProductDisplayName(product).length > 20 ? `${getProductDisplayName(product).substring(0, 20)}...` : getProductDisplayName(product)}</span>
                    </button>
                  ))}
                  
                  {availableProducts.length > 20 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                      + {availableProducts.length - 20} more products
                    </span>
                  )}
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
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => handleRetailerSelection('all')}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                      selectedRetailers.includes('all')
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/30'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>All</span>
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
                <div className="p-3 rounded-md">
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
                      {getAvailableMonths ? getAvailableMonths().map(month => (
                        <option key={month} value={month}>{month}</option>
                      )) : null}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedFilterPanel;