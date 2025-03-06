import React, { createContext, useState, useContext, useEffect } from 'react';
import _ from 'lodash';
import { useData } from './DataContext';

// Create context
const FilterContext = createContext();

// Custom hook for using this context
export const useFilter = () => useContext(FilterContext);

// Provider component
export const FilterProvider = ({ children }) => {
  const { data } = useData();
  
  // Filter state
  const [selectedProducts, setSelectedProducts] = useState(['all']);
  const [selectedRetailers, setSelectedRetailers] = useState(['all']);
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  
  // Comparison state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonDateRange, setComparisonDateRange] = useState('custom');
  const [comparisonStartDate, setComparisonStartDate] = useState('');
  const [comparisonEndDate, setComparisonEndDate] = useState('');
  const [comparisonMonth, setComparisonMonth] = useState('');
  
  // UI state
  const [isFilterPanelCollapsed, setIsFilterPanelCollapsed] = useState(false);
  
  // Initialize date range when data changes
  useEffect(() => {
    // Check if data exists and is an array
    if (data && Array.isArray(data) && data.length > 0) {
      const dates = data.map(row => row.receipt_date);
      const minDate = _.min(dates);
      const maxDate = _.max(dates);
      
      setStartDate(minDate);
      setEndDate(maxDate);
      
      // Initialize comparison dates too, for one month before the primary period
      const min = new Date(minDate);
      const max = new Date(maxDate);
      
      // Calculate a comparable previous period (e.g., previous month)
      const diffDays = Math.ceil((max - min) / (1000 * 60 * 60 * 24));
      const compEndDate = new Date(min);
      compEndDate.setDate(compEndDate.getDate() - 1);
      
      const compStartDate = new Date(compEndDate);
      compStartDate.setDate(compStartDate.getDate() - diffDays);
      
      setComparisonStartDate(compStartDate.toISOString().split('T')[0]);
      setComparisonEndDate(compEndDate.toISOString().split('T')[0]);
      
      // Set first available month
      const months = _.uniq(data.map(item => item.month)).sort();
      if (months.length > 0) {
        setSelectedMonth(months[months.length - 1]);
        setComparisonMonth(months.length > 1 ? months[months.length - 2] : months[0]);
      }
    }
  }, [data]);
  
  // Toggle filter panel
  const toggleFilterPanel = () => {
    setIsFilterPanelCollapsed(!isFilterPanelCollapsed);
  };
  
  // Handle product selection
  const handleProductSelection = (product) => {
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
  
  // Get available months from data
  const getAvailableMonths = () => {
    if (!data || !Array.isArray(data)) return [];
    return _.uniq(data.map(item => item.month)).sort();
  };
  
  // Get filtered data based on all selections
  const getFilteredData = (customFilters) => {
    if (!data || !Array.isArray(data)) return [];
    
    // Use provided filters or default to current state
    const filters = customFilters || {
      selectedProducts,
      selectedRetailers,
      dateRange,
      startDate,
      endDate,
      selectedMonth
    };
    
    return data.filter(item => {
      // Product filter
      const productMatch = 
        !filters.selectedProducts || 
        filters.selectedProducts.includes('all') || 
        filters.selectedProducts.includes(item.product_name);
      
      // Retailer filter
      const retailerMatch = 
        !filters.selectedRetailers ||
        filters.selectedRetailers.includes('all') || 
        filters.selectedRetailers.includes(item.chain);
      
      // Date filter
      let dateMatch = true;
      
      if (filters.dateRange === 'month' && filters.selectedMonth) {
        dateMatch = item.month === filters.selectedMonth;
      } else if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
        dateMatch = item.receipt_date >= filters.startDate && item.receipt_date <= filters.endDate;
      }
      
      return productMatch && retailerMatch && dateMatch;
    });
  };
  
  // Formatting helper for month display
  const formatMonth = (monthStr) => {
    try {
      if (!monthStr) return '';
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    } catch (e) {
      return monthStr || '';
    }
  };
  
  // Create the filter state object to expose to consumers
  const filters = {
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
    comparisonMonth
  };
  
  return (
    <FilterContext.Provider value={{
      // State
      ...filters,
      isFilterPanelCollapsed,
      filters,
      
      // Setters
      setSelectedProducts,
      setSelectedRetailers,
      setDateRange,
      setStartDate,
      setEndDate,
      setSelectedMonth,
      setComparisonMode,
      setComparisonDateRange,
      setComparisonStartDate,
      setComparisonEndDate,
      setComparisonMonth,
      
      // Methods
      toggleFilterPanel,
      handleProductSelection,
      handleRetailerSelection,
      getAvailableMonths,
      getFilteredData,
      formatMonth
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export default FilterContext;