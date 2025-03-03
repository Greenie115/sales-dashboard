import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import _ from 'lodash';

/**
 * FilterPanel component for filtering data across all tabs
 */
const FilterPanel = ({ activeTab }) => {
  const { 
    salesData,
    offerData,
    hasData,
    selectedProducts = ['all'],
    selectedRetailers = ['all'],
    dateRange = 'all',
    startDate = '',
    endDate = '',
    selectedMonth = '',
    setSelectedProducts,
    setSelectedRetailers,
    setDateRange,
    setStartDate,
    setEndDate,
    setSelectedMonth,
    comparisonMode = false,
    setComparisonMode
  } = useData();
  
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
  
  // Handle product selection
  const handleProductSelection = (product) => {
    if (!setSelectedProducts) return;
    
    let newSelectedProducts;
    
    if (product === 'all') {
      newSelectedProducts = ['all'];
    } else {
      if (selectedProducts.includes('all')) {
        newSelectedProducts = [product];
      } else if (selectedProducts.includes(product)) {
        newSelectedProducts = selectedProducts.filter(p => p !== product);
        if (newSelectedProducts.length === 0) {
          newSelectedProducts = ['all'];
        }
      } else {
        newSelectedProducts = [...selectedProducts, product];
      }
    }
    
    setSelectedProducts(newSelectedProducts);
  };
  
  // Handle retailer selection
  const handleRetailerSelection = (retailer) => {
    if (!setSelectedRetailers) return;
    
    let newSelectedRetailers;
    
    if (retailer === 'all') {
      newSelectedRetailers = ['all'];
    } else {
      if (selectedRetailers.includes('all')) {
        newSelectedRetailers = [retailer];
      } else if (selectedRetailers.includes(retailer)) {
        newSelectedRetailers = selectedRetailers.filter(r => r !== retailer);
        if (newSelectedRetailers.length === 0) {
          newSelectedRetailers = ['all'];
        }
      } else {
        newSelectedRetailers = [...selectedRetailers, retailer];
      }
    }
    
    setSelectedRetailers(newSelectedRetailers);
  };
  
  // Get available months from data
  const getAvailableMonths = () => {
    const data = salesData || [];
    if (!data || data.length === 0) return [];
    return _.uniq(data.map(item => item.month).filter(Boolean)).sort();
  };
  
  // Format month for display
  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    try {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    } catch (e) {
      return monthStr;
    }
  };
  
  // Available retailers from data
  const availableRetailers = _.uniq((salesData || []).map(item => item.chain || ''))
    .filter(Boolean)
    .sort();
  
  // Available products from data
  const availableProducts = _.uniq((salesData || []).map(item => item.product_name || ''))
    .filter(Boolean)
    .sort();

  // If no data is available, don't show the filter panel
  if (!hasData) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200">
      {/* Header with expand/collapse */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-lg font-medium text-gray-900">Filters</h2>
          <div className="ml-3 flex flex-wrap items-center">
            <span className="text-sm text-gray-500 mr-2">
              {selectedProducts.includes('all') ? 'All Products' : `${selectedProducts.length} Products`}
            </span>
            <span className="text-sm text-gray-400 mx-1">•</span>
            <span className="text-sm text-gray-500 mr-2">
              {selectedRetailers.includes('all') ? 'All Retailers' : `${selectedRetailers.length} Retailers`}
            </span>
            <span className="text-sm text-gray-400 mx-1">•</span>
            <span className="text-sm text-gray-500">
              {dateRange === 'all' ? 'All Time' : 
               dateRange === 'month' ? `Month: ${formatMonth(selectedMonth)}` : 
               `${startDate} to ${endDate}`}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          {setComparisonMode && (
            <button 
              onClick={() => setComparisonMode(!comparisonMode)}
              className={`mr-3 px-3 py-1 text-sm rounded-md ${
                comparisonMode 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {comparisonMode ? 'Comparison On' : 'Compare Periods'}
            </button>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
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
                <h3 className="text-sm font-medium text-gray-700">Products</h3>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-4 w-4 text-gray-400 transition-transform ${expandedSection === 'products' || expandedSection === 'all' ? 'transform rotate-180' : ''}`} 
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
                        ? 'bg-pink-100 text-pink-800 border border-pink-200'
                        : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    <span>All</span>
                    {!selectedProducts.includes('all') && (
                      <svg className="ml-1 h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                          ? 'bg-pink-100 text-pink-800 border border-pink-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      <span>{product.length > 20 ? `${product.substring(0, 20)}...` : product}</span>
                      {selectedProducts.includes(product) && !selectedProducts.includes('all') ? (
                        <svg className="ml-1 h-3 w-3 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="ml-1 h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <h3 className="text-sm font-medium text-gray-700">Retailers</h3>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-4 w-4 text-gray-400 transition-transform ${expandedSection === 'retailers' || expandedSection === 'all' ? 'transform rotate-180' : ''}`} 
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
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    <span>All</span>
                    {!selectedRetailers.includes('all') && (
                      <svg className="ml-1 h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      <span>{retailer}</span>
                      {selectedRetailers.includes(retailer) && !selectedRetailers.includes('all') ? (
                        <svg className="ml-1 h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="ml-1 h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <h3 className="text-sm font-medium text-gray-700">Date Range</h3>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-4 w-4 text-gray-400 transition-transform ${expandedSection === 'dates' || expandedSection === 'all' ? 'transform rotate-180' : ''}`} 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              
              <div className={`transition-all duration-300 overflow-hidden ${expandedSection === 'dates' || expandedSection === 'all' ? 'max-h-96' : 'max-h-0'}`}>
                {/* Primary date range */}
                <div className={`p-3 rounded-md ${comparisonMode ? "bg-pink-50 mb-3" : ""}`}>
                  {comparisonMode && (
                    <div className="text-xs font-medium text-pink-700 mb-2 flex items-center">
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
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        All Dates
                      </button>
                      
                      <button
                        onClick={() => setDateRange('month')}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          dateRange === 'month'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        By Month
                      </button>
                      
                      <button
                        onClick={() => setDateRange('custom')}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          dateRange === 'custom'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
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
                      className="block w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 outline-none"
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
                        <label className="block text-xs text-gray-500 mb-1">From</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="block w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">To</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="block w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 outline-none"
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
                        <div className={`relative w-10 h-5 transition duration-200 ease-linear rounded-full ${comparisonMode ? 'bg-blue-400' : 'bg-gray-300'}`}>
                          <div className={`absolute left-0 w-5 h-5 transition duration-200 ease-linear transform bg-white rounded-full ${comparisonMode ? 'translate-x-full border-blue-400' : 'translate-x-0 border-gray-300'} border`}></div>
                        </div>
                        <span className="ml-2 text-sm text-gray-700">Compare periods</span>
                      </label>
                    </div>
                  </div>
                )}
                
                {/* Comparison period controls */}
                {comparisonMode && (
                  <div className="p-3 rounded-md bg-blue-50">
                    <div className="text-xs font-medium text-blue-700 mb-2 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                      </svg>
                      Comparison Period
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      Configure comparison period settings here
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Active filters summary */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {!selectedProducts.includes('all') && selectedProducts.map(product => (
                <div key={product} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                  <span>Product: {product.length > 15 ? `${product.substring(0, 15)}...` : product}</span>
                  <button 
                    onClick={() => handleProductSelection(product)}
                    className="ml-1 text-pink-600 hover:text-pink-800"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
              
              {!selectedRetailers.includes('all') && selectedRetailers.map(retailer => (
                <div key={retailer} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <span>Retailer: {retailer}</span>
                  <button 
                    onClick={() => handleRetailerSelection(retailer)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
              
              {dateRange !== 'all' && setDateRange && (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  <span>
                    Date: {dateRange === 'month' ? formatMonth(selectedMonth) : `${startDate} to ${endDate}`}
                  </span>
                  <button 
                    onClick={() => setDateRange('all')}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
              
              {comparisonMode && setComparisonMode && (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <span>Comparison Mode</span>
                  <button 
                    onClick={() => setComparisonMode(false)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
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