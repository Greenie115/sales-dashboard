import React from 'react';
import _ from 'lodash';

const FilterPanel = ({
  data,
  selectedProducts,
  selectedRetailers,
  dateRange,
  startDate,
  endDate,
  selectedMonth,
  comparisonMode,
  comparisonDateRange,
  comparisonStartDate,
  comparisonEndDate,
  comparisonMonth,
  handleProductSelection,
  handleRetailerSelection,
  setDateRange,
  setStartDate,
  setEndDate,
  setSelectedMonth,
  setComparisonMode,
  setComparisonDateRange,
  setComparisonStartDate,
  setComparisonEndDate,
  setComparisonMonth
}) => {
  // Helper function to get available months from data
  const getAvailableMonths = () => {
    return _.uniq(data.map(item => item.month)).sort();
  };

  return (
    <div className="mb-6 bg-white p-4 shadow rounded-lg">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Product Filter */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Products</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleProductSelection('all')}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedProducts.includes('all')
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            
            {_.uniq(data.map(item => item.product_name || '')).filter(Boolean).slice(0, 10).map(product => (
              <button
                key={product}
                onClick={() => handleProductSelection(product)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedProducts.includes(product) && !selectedProducts.includes('all')
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {product}
              </button>
            ))}
          </div>
        </div>
        
        {/* Retailer Filter */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Retailers</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleRetailerSelection('all')}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedRetailers.includes('all')
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            
            {_.uniq(data.map(item => item.chain || '')).filter(Boolean).sort().slice(0, 10).map(retailer => (
              <button
                key={retailer}
                onClick={() => handleRetailerSelection(retailer)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedRetailers.includes(retailer) && !selectedRetailers.includes('all')
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {retailer}
              </button>
            ))}
          </div>
        </div>
        
        {/* Date Range Filter */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Date Range</h3>
            <div>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={comparisonMode}
                  onChange={(e) => setComparisonMode(e.target.checked)}
                  className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <span className="ml-2 text-xs text-gray-700">Compare periods</span>
              </label>
            </div>
          </div>
          
          {/* Primary date range */}
          <div className={`p-3 rounded-md ${comparisonMode ? "bg-pink-50 mb-3" : ""}`}>
            {comparisonMode && <div className="text-xs font-medium text-pink-700 mb-2">Primary Period</div>}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setDateRange('all')}
                className={`px-3 py-1 rounded-full text-sm ${
                  dateRange === 'all'
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Dates
              </button>
              
              <button
                onClick={() => setDateRange('month')}
                className={`px-3 py-1 rounded-full text-sm ${
                  dateRange === 'month'
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                By Month
              </button>
              
              <button
                onClick={() => setDateRange('custom')}
                className={`px-3 py-1 rounded-full text-sm ${
                  dateRange === 'custom'
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Custom
              </button>
            </div>
            
            {dateRange === 'month' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="block w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm"
              >
                <option value="">Select Month</option>
                {getAvailableMonths().map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            )}
            
            {dateRange === 'custom' && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm"
                />
              </div>
            )}
          </div>
          
          {/* Comparison date range */}
          {comparisonMode && (
            <div className="p-3 rounded-md bg-pink-50">
              <div className="text-xs font-medium text-pink-700 mb-2">Comparison Period</div>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setComparisonDateRange('month')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    comparisonDateRange === 'month'
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  By Month
                </button>
                
                <button
                  onClick={() => setComparisonDateRange('custom')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    comparisonDateRange === 'custom'
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Custom
                </button>
              </div>
              
              {comparisonDateRange === 'month' && (
                <select
                  value={comparisonMonth}
                  onChange={(e) => setComparisonMonth(e.target.value)}
                  className="block w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm"
                >
                  <option value="">Select Month</option>
                  {getAvailableMonths().map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              )}
              
              {comparisonDateRange === 'custom' && (
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={comparisonStartDate}
                    onChange={(e) => setComparisonStartDate(e.target.value)}
                    className="block w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm"
                  />
                  <input
                    type="date"
                    value={comparisonEndDate}
                    onChange={(e) => setComparisonEndDate(e.target.value)}
                    className="block w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;