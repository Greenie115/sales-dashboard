import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Button, Icon } from '../ui';

/**
 * SharedFilterPanel - Filter panel for shared dashboards
 * Allows clients to filter data in shared view if enabled
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
  brandMapping = {},
  allowClientFiltering = false
}) => {
  const { darkMode } = useTheme();
  const [showFilters, setShowFilters] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableRetailers, setAvailableRetailers] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);

  // Get unique products and retailers from data
  useEffect(() => {
    if (!salesData || !Array.isArray(salesData)) return;

    // Extract unique products
    const products = new Set();
    salesData.forEach(item => {
      if (item.product_name) {
        products.add(item.product_name);
      }
    });
    setAvailableProducts(Array.from(products).sort());

    // Extract unique retailers
    const retailers = new Set();
    salesData.forEach(item => {
      if (item.chain) {
        retailers.add(item.chain);
      }
    });
    setAvailableRetailers(Array.from(retailers).sort());

    // Get available months if function is provided
    if (typeof getAvailableMonths === 'function') {
      setAvailableMonths(getAvailableMonths());
    } else {
      // Extract unique months as fallback
      const months = new Set();
      salesData.forEach(item => {
        if (item.month) months.add(item.month);
      });
      setAvailableMonths(Array.from(months).sort());
    }
  }, [salesData, getAvailableMonths]);

  // If client filtering is not allowed, don't render anything
  if (!allowClientFiltering) {
    return null;
  }

  // Handle product selection
  const handleProductChange = (e) => {
    const value = e.target.value;
    if (value === 'all') {
      setSelectedProducts(['all']);
    } else if (selectedProducts.includes('all')) {
      setSelectedProducts([value]);
    } else if (selectedProducts.includes(value)) {
      const newSelectedProducts = selectedProducts.filter(p => p !== value);
      setSelectedProducts(newSelectedProducts.length ? newSelectedProducts : ['all']);
    } else {
      setSelectedProducts([...selectedProducts, value]);
    }
  };

  // Handle retailer selection
  const handleRetailerChange = (e) => {
    const value = e.target.value;
    if (value === 'all') {
      setSelectedRetailers(['all']);
    } else if (selectedRetailers.includes('all')) {
      setSelectedRetailers([value]);
    } else if (selectedRetailers.includes(value)) {
      const newSelectedRetailers = selectedRetailers.filter(r => r !== value);
      setSelectedRetailers(newSelectedRetailers.length ? newSelectedRetailers : ['all']);
    } else {
      setSelectedRetailers([...selectedRetailers, value]);
    }
  };

  // Handle date range change
  const handleDateRangeChange = (e) => {
    const value = e.target.value;
    setDateRange(value);
    
    // Reset custom date fields if needed
    if (value !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
    
    // Reset month if needed
    if (value !== 'month') {
      setSelectedMonth('');
    }
  };

  // Get product display name
  const getProductDisplayName = (productName) => {
    // Try to map to a brand name if it exists in the mapping
    if (brandMapping && brandMapping[productName]) {
      return brandMapping[productName];
    }
    
    // Otherwise use the product name
    return productName;
  };

  // Format month for display
  const formatMonth = (month) => {
    if (!month) return '';
    
    try {
      const [year, monthNum] = month.split('-');
      const date = new Date(year, parseInt(monthNum) - 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch (e) {
      return month;
    }
  };

  return (
    <div className={`mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <Icon name="filter" className="mr-2 text-pink-500" />
          <h2 className="text-lg font-medium">Filter Dashboard</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          icon={<Icon name={showFilters ? "chevronUp" : "chevronDown"} />}
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>
      
      {showFilters && (
        <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Products filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Products</label>
              <div className="max-h-40 overflow-y-auto p-2 border rounded-md space-y-1 scrollbar-thin">
                <div className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    id="product-all"
                    value="all"
                    checked={selectedProducts.includes('all')}
                    onChange={handleProductChange}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded dark:border-gray-600"
                  />
                  <label htmlFor="product-all" className="ml-2 block text-sm">
                    All Products
                  </label>
                </div>
                {availableProducts.map(product => (
                  <div key={product} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`product-${product}`}
                      value={product}
                      checked={selectedProducts.includes(product)}
                      onChange={handleProductChange}
                      disabled={selectedProducts.includes('all')}
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded dark:border-gray-600"
                    />
                    <label htmlFor={`product-${product}`} className="ml-2 block text-sm truncate">
                      {getProductDisplayName(product)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Retailers filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Retailers</label>
              <div className="max-h-40 overflow-y-auto p-2 border rounded-md space-y-1 scrollbar-thin">
                <div className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    id="retailer-all"
                    value="all"
                    checked={selectedRetailers.includes('all')}
                    onChange={handleRetailerChange}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded dark:border-gray-600"
                  />
                  <label htmlFor="retailer-all" className="ml-2 block text-sm">
                    All Retailers
                  </label>
                </div>
                {availableRetailers.map(retailer => (
                  <div key={retailer} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`retailer-${retailer}`}
                      value={retailer}
                      checked={selectedRetailers.includes(retailer)}
                      onChange={handleRetailerChange}
                      disabled={selectedRetailers.includes('all')}
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded dark:border-gray-600"
                    />
                    <label htmlFor={`retailer-${retailer}`} className="ml-2 block text-sm truncate">
                      {retailer}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Date filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={handleDateRangeChange}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="all">All Dates</option>
                <option value="month">By Month</option>
                <option value="custom">Custom Range</option>
              </select>
              
              {dateRange === 'month' && (
                <div className="mt-2">
                  <label className="block text-sm font-medium mb-1">Select Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Select a month</option>
                    {availableMonths.map(month => (
                      <option key={month} value={month}>
                        {formatMonth(month)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {dateRange === 'custom' && (
                <div className="mt-2 space-y-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedFilterPanel;