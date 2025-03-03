// src/components/filters/FilterPanel.js
import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import _ from 'lodash';
import { formatMonth } from '../../utils/exportUtils';

const FilterPanel = () => {
  const { state, actions } = useDashboard();
  const { 
    data, 
    filters, 
    comparison, 
    activeTab 
  } = state;
  
  // Local state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSection, setExpandedSection] = useState('all'); // 'all', 'products', 'retailers', 'dates'
  
  // Available months from data
  const getAvailableMonths = () => {
    return _.uniq(data.map(item => item.month)).sort();
  };
  
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
    let newSelectedProducts;
    
    if (product === 'all') {
      newSelectedProducts = ['all'];
    } else {
      if (filters.selectedProducts.includes('all')) {
        newSelectedProducts = [product];
      } else if (filters.selectedProducts.includes(product)) {
        newSelectedProducts = filters.selectedProducts.filter(p => p !== product);
        if (newSelectedProducts.length === 0) {
          newSelectedProducts = ['all'];
        }
      } else {
        newSelectedProducts = [...filters.selectedProducts, product];
      }
    }
    
    actions.updateFilters({ selectedProducts: newSelectedProducts });
  };
  
  // Handle retailer selection
  const handleRetailerSelection = (retailer) => {
    let newSelectedRetailers;
    
    if (retailer === 'all') {
      newSelectedRetailers = ['all'];
    } else {
      if (filters.selectedRetailers.includes('all')) {
        newSelectedRetailers = [retailer];
      } else if (filters.selectedRetailers.includes(retailer)) {
        newSelectedRetailers = filters.selectedRetailers.filter(r => r !== retailer);
        if (newSelectedRetailers.length === 0) {
          newSelectedRetailers = ['all'];
        }
      } else {
        newSelectedRetailers = [...filters.selectedRetailers, retailer];
      }
    }
    
    actions.updateFilters({ selectedRetailers: newSelectedRetailers });
  };
  
  // Available retailers from data
  const availableRetailers = _.uniq(data.map(item => item.chain || ''))
    .filter(Boolean)
    .sort();
  
  // Available products from data
  const availableProducts = _.uniq(data.map(item => item.product_name || ''))
    .filter(Boolean)
    .sort();
  
  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200">
      {/* Header with expand/collapse */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-lg font-medium text-gray-900">Filters</h2>
          <div className="ml-3 flex flex-wrap items-center">
            <span className="text-sm text-gray-500 mr-2">
              {filters.selectedProducts.includes('all') ? 'All Products' : `${filters.selectedProducts.length} Products`}
            </span>
            <span className="text-sm text-gray-400 mx-1">•</span>
            <span className="text-sm text-gray-500 mr-2">
              {filters.selectedRetailers.includes('all') ? 'All Retailers' : `${filters.selectedRetailers.length} Retailers`}
            </span>
            <span className="text-sm text-gray-400 mx-1">•</span>
            <span className="text-sm text-gray-500">
              {filters.dateRange === 'all' ? 'All Time' : 
               filters.dateRange === 'month' ? `Month: ${formatMonth(filters.selectedMonth)}` : 
               `${filters.startDate} to ${filters.endDate}`}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <button 
            onClick={() => actions.toggleComparison(!comparison.enabled)}
            className={`mr-3 px-3 py-1 text-sm rounded-md ${
              comparison.enabled 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {comparison.enabled ? 'Comparison On' : 'Compare Periods'}
          </button>
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
                      filters.selectedProducts.includes('all')
                        ? 'bg-pink-100 text-pink-800 border border-pink-200'
                        : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    <span>All</span>
                    {!filters.selectedProducts.includes('all') && (
                      <svg className="ml-1 h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                  </button>
                  
                  {availableProducts.slice(0, 10).map(product => (
                    <button
                      key={product}
                      onClick={() => handleProductSelection(product)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                        filters.selectedProducts.includes(product) && !filters.selectedProducts.includes('all')
                          ? 'bg-pink-100 text-pink-800 border border-pink-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      <span>{product.length > 20 ? `${product.substring(0, 20)}...` : product}</span>
                      {filters.selectedProducts.includes(product) && !filters.selectedProducts.includes('all') ? (
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
                      filters.selectedRetailers.includes('all')
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    <span>All</span>
                    {!filters.selectedRetailers.includes('all') && (
                      <svg className="ml-1 h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                  </button>
                  
                  {availableRetailers.slice(0, 10).map(retailer => (
                    <button
                      key={retailer}
                      onClick={() => handleRetailerSelection(retailer)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                        filters.selectedRetailers.includes(retailer) && !filters.selectedRetailers.includes('all')
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      <span>{retailer}</span>
                      {filters.selectedRetailers.includes(retailer) && !filters.selectedRetailers.includes('all') ? (
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
                <div className={`p-3 rounded-md ${comparison.enabled ? "bg-pink-50 mb-3" : ""}`}>
                  {comparison.enabled && (
                    <div className="text-xs font-medium text-pink-700 mb-2 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                      </svg>
                      Primary Period
                    </div>
                  )}
                  
                  <div className="flex gap-2 flex-wrap mb-2">
                    <button
                      onClick={() => actions.updateFilters({ dateRange: 'all' })}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        filters.dateRange === 'all'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      All Dates
                    </button>
                    
                    <button
                      onClick={() => actions.updateFilters({ dateRange: 'month' })}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        filters.dateRange === 'month'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      By Month
                    </button>
                    
                    <button
                      onClick={() => actions.updateFilters({ dateRange: 'custom' })}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        filters.dateRange === 'custom'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                  
                  {filters.dateRange === 'month' && (
                    <select
                      value={filters.selectedMonth}
                      onChange={(e) => actions.updateFilters({ selectedMonth: e.target.value })}
                      className="block w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 outline-none"
                    >
                      <option value="">Select Month</option>
                      {getAvailableMonths().map(month => (
                        <option key={month} value={month}>{formatMonth(month)}</option>
                      ))}
                    </select>
                  )}
                  
                  {filters.dateRange === 'custom' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">From</label>
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => actions.updateFilters({ startDate: e.target.value })}
                          className="block w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">To</label>
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => actions.updateFilters({ endDate: e.target.value })}
                          className="block w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Comparison mode toggle */}
                <div className="flex items-center mt-2 mb-3">
                  <div className="form-control">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={comparison.enabled}
                        onChange={(e) => actions.toggleComparison(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`relative w-10 h-5 transition duration-200 ease-linear rounded-full ${comparison.enabled ? 'bg-blue-400' : 'bg-gray-300'}`}>
                        <div className={`absolute left-0 w-5 h-5 transition duration-200 ease-linear transform bg-white rounded-full ${comparison.enabled ? 'translate-x-full border-blue-400' : 'translate-x-0 border-gray-300'} border`}></div>
                      </div>
                      <span className="ml-2 text-sm text-gray-700">Compare periods</span>
                    </label>
                  </div>
                </div>
                
                {/* Comparison period controls would go here */}
                {comparison.enabled && (
                  <div className="p-3 rounded-md bg-blue-50">
                    <div className="text-xs font-medium text-blue-700 mb-2 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                      </svg>
                      Comparison Period
                    </div>
                    
                    {/* Simplified comparison controls for brevity */}
                    <div className="text-sm text-gray-600">
                      Configure comparison period settings here...
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Active filters summary */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {!filters.selectedProducts.includes('all') && filters.selectedProducts.map(product => (
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
              
              {!filters.selectedRetailers.includes('all') && filters.selectedRetailers.map(retailer => (
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
              
              {filters.dateRange !== 'all' && (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  <span>
                    Date: {filters.dateRange === 'month' ? formatMonth(filters.selectedMonth) : `${filters.startDate} to ${filters.endDate}`}
                  </span>
                  <button 
                    onClick={() => actions.updateFilters({ dateRange: 'all' })}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
              
              {comparison.enabled && (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <span>Comparison Mode</span>
                  <button 
                    onClick={() => actions.toggleComparison(false)}
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