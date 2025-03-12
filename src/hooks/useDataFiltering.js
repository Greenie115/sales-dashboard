// src/hooks/useDataFiltering.js
import { useState, useCallback } from 'react';

/**
 * Hook for filtering data based on products, retailers, and date ranges
 * 
 * @param {Array} initialData - The initial dataset to filter
 * @returns {Object} Filter state and methods
 */
export const useDataFiltering = (initialData = []) => {
  const [selectedProducts, setSelectedProducts] = useState(['all']);
  const [selectedRetailers, setSelectedRetailers] = useState(['all']);
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  /**
   * Get filtered data based on current filter settings
   * @param {Object} customFilters - Optional custom filters to use instead of state
   * @param {boolean} isComparison - Whether this is for comparison mode
   * @returns {Array} Filtered data array
   */
  const getFilteredData = useCallback((customFilters = null, isComparison = false) => {
    if (!initialData || !Array.isArray(initialData) || initialData.length === 0) {
      return [];
    }
    
    try {
      // Get the filters to use (either custom or from state)
      const filterProducts = customFilters?.selectedProducts || selectedProducts;
      const filterRetailers = customFilters?.selectedRetailers || selectedRetailers;
      const filterDateRange = customFilters?.dateRange || dateRange;
      const filterStartDate = customFilters?.startDate || startDate;
      const filterEndDate = customFilters?.endDate || endDate;
      const filterSelectedMonth = customFilters?.selectedMonth || selectedMonth;

      return initialData.filter(item => {
        if (!item) return false;
        
        // Product filter
        const productMatch = filterProducts.includes('all') || 
                            (item.product_name && filterProducts.includes(item.product_name));
        
        // Retailer filter
        const retailerMatch = filterRetailers.includes('all') || 
                              (item.chain && filterRetailers.includes(item.chain));
        
        // Date filter
        let dateMatch = true;
        if (!isComparison) {
          if (filterDateRange === 'month' && filterSelectedMonth && item.month) {
            dateMatch = item.month === filterSelectedMonth;
          } else if (filterDateRange === 'custom' && filterStartDate && filterEndDate && item.receipt_date) {
            dateMatch = item.receipt_date >= filterStartDate && item.receipt_date <= filterEndDate;
          }
        } else if (customFilters?.comparisonDateRange) {
          // Handle comparison mode date filtering
          if (customFilters.comparisonDateRange === 'month' && customFilters.comparisonMonth && item.month) {
            dateMatch = item.month === customFilters.comparisonMonth;
          } else if (customFilters.comparisonDateRange === 'custom' && customFilters.comparisonStartDate && 
                    customFilters.comparisonEndDate && item.receipt_date) {
            dateMatch = item.receipt_date >= customFilters.comparisonStartDate && 
                       item.receipt_date <= customFilters.comparisonEndDate;
          }
        }
        
        return productMatch && retailerMatch && dateMatch;
      });
    } catch (e) {
      console.error("Error in getFilteredData:", e);
      return [];
    }
  }, [initialData, selectedProducts, selectedRetailers, dateRange, selectedMonth, startDate, endDate]);

  /**
   * Handle product selection toggle
   * @param {string} product - Product to toggle selection
   */
  const handleProductSelection = useCallback((product) => {
    setSelectedProducts(prev => {
      if (product === 'all') {
        return ['all'];
      } else {
        const newSelection = prev.includes('all') 
          ? [product]
          : prev.includes(product)
            ? prev.filter(p => p !== product)
            : [...prev, product];
        
        return newSelection.length ? newSelection : ['all'];
      }
    });
  }, []);

  /**
   * Handle retailer selection toggle
   * @param {string} retailer - Retailer to toggle selection
   */
  const handleRetailerSelection = useCallback((retailer) => {
    setSelectedRetailers(prev => {
      if (retailer === 'all') {
        return ['all'];
      } else {
        const newSelection = prev.includes('all') 
          ? [retailer]
          : prev.includes(retailer)
            ? prev.filter(r => r !== retailer)
            : [...prev, retailer];
        
        return newSelection.length ? newSelection : ['all'];
      }
    });
  }, []);

  /**
   * Get current filter settings as an object
   * @returns {Object} Current filter settings
   */
  const getCurrentFilters = useCallback(() => {
    return {
      selectedProducts,
      selectedRetailers,
      dateRange,
      startDate,
      endDate,
      selectedMonth
    };
  }, [selectedProducts, selectedRetailers, dateRange, startDate, endDate, selectedMonth]);

  /**
   * Reset all filters to default values
   */
  const resetFilters = useCallback(() => {
    setSelectedProducts(['all']);
    setSelectedRetailers(['all']);
    setDateRange('all');
    setStartDate('');
    setEndDate('');
    setSelectedMonth('');
  }, []);

  /**
   * Get available values for filters from the data
   * @returns {Object} Available filter values
   */
  const getAvailableFilterOptions = useCallback(() => {
    if (!initialData || initialData.length === 0) {
      return { products: [], retailers: [], months: [] };
    }

    // Get unique products
    const products = [...new Set(
      initialData
        .map(item => item.product_name)
        .filter(Boolean)
    )].sort();

    // Get unique retailers
    const retailers = [...new Set(
      initialData
        .map(item => item.chain)
        .filter(Boolean)
    )].sort();

    // Get unique months
    const months = [...new Set(
      initialData
        .map(item => item.month)
        .filter(Boolean)
    )].sort();

    return { products, retailers, months };
  }, [initialData]);

  return {
    // Current filter state
    filters: {
      selectedProducts,
      selectedRetailers,
      dateRange,
      startDate,
      endDate,
      selectedMonth
    },
    
    // Filter setters
    setters: {
      setSelectedProducts,
      setSelectedRetailers,
      setDateRange,
      setStartDate,
      setEndDate,
      setSelectedMonth
    },
    
    // Methods
    getFilteredData,
    handleProductSelection,
    handleRetailerSelection,
    getCurrentFilters,
    resetFilters,
    getAvailableFilterOptions
  };
};