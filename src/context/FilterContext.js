import React, { createContext, useState, useContext, useEffect } from 'react';
import min from 'lodash/min';
import max from 'lodash/max';
import uniq from 'lodash/uniq';
import { useData } from './DataContext';
import { filterSalesData, calculateMetrics as calculateMetricsUtil, getRetailerDistribution as getRetailerDistributionUtil, getProductDistribution as getProductDistributionUtil } from '../utils/dataProcessing';

// Create context
const FilterContext = createContext();

// Custom hook for using this context
export const useFilter = () => useContext(FilterContext);

// Provider component
export const FilterProvider = ({ children }) => {
  const { salesData } = useData();

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

  // Initialize date range when salesData changes
  useEffect(() => {
    // Check if salesData exists and is an array
    if (salesData && Array.isArray(salesData) && salesData.length > 0) {
      const dates = salesData.map(row => row.receipt_date);
      const minDate = min(dates);
      const maxDate = max(dates);

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
      const months = uniq(salesData.map(item => item.month)).sort();
      if (months.length > 0) {
        setSelectedMonth(months[months.length - 1]);
        setComparisonMonth(months.length > 1 ? months[months.length - 2] : months[0]);
      }
    }
  }, [salesData]);

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

  // Get available months from salesData
  const getAvailableMonths = () => {
    if (!salesData || !Array.isArray(salesData)) return [];
    return uniq(salesData.map(item => item.month)).sort();
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

  // We already have salesData from useData() at the top of the component

  // Function to get filtered data based on current filters
  const getFilteredData = (customFilters = null) => {
    // Use provided custom filters or current filters
    const filtersToUse = customFilters || {
      selectedProducts,
      selectedRetailers,
      dateRange,
      startDate,
      endDate,
      selectedMonth
    };

    return filterSalesData(salesData, filtersToUse);
  };

  // Function to calculate metrics for the filtered data
  const calculateMetrics = (customData = null) => {
    const filteredData = customData || getFilteredData();
    return calculateMetricsUtil(filteredData);
  };

  // Function to get retailer distribution for the filtered data
  const getRetailerDistribution = (customData = null) => {
    const filteredData = customData || getFilteredData();
    return getRetailerDistributionUtil(filteredData);
  };

  // Function to get product distribution for the filtered data
  const getProductDistribution = (customData = null, customBrandMapping = {}) => {
    const filteredData = customData || getFilteredData();
    return getProductDistributionUtil(filteredData, customBrandMapping);
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
      formatMonth,
      getFilteredData,
      calculateMetrics,
      getRetailerDistribution,
      getProductDistribution
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export default FilterContext;