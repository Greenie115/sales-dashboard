// Copy this fixed function into your DataContext.js to replace the current getFilteredData function

const getFilteredData = useCallback((customFilterOrCompare, isComparisonArg) => {
  // Handle multiple parameter patterns for backward compatibility
  let customFilters = null;
  let isComparison = false;
  
  // Check parameter types
  if (typeof customFilterOrCompare === 'boolean') {
    // Old usage: passing boolean directly
    isComparison = customFilterOrCompare;
  } else if (customFilterOrCompare && typeof customFilterOrCompare === 'object') {
    // New usage: passing filters object
    customFilters = customFilterOrCompare;
  }
  
  // Second parameter takes precedence if provided
  if (typeof isComparisonArg === 'boolean') {
    isComparison = isComparisonArg;
  }
  
  // Check if customFilters has an isComparison property
  if (customFilters && typeof customFilters.isComparison === 'boolean') {
    isComparison = customFilters.isComparison;
  }

  // Safety check for data
  if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
    console.log("getFilteredData: No data to filter");
    return [];
  }
  
  try {
    return salesData.filter(item => {
      if (!item) return false;
      
      // Use provided filters or fallback to context state
      const filterProducts = customFilters?.selectedProducts || selectedProducts;
      const filterRetailers = customFilters?.selectedRetailers || selectedRetailers;
      const filterDateRange = customFilters?.dateRange || dateRange;
      const filterStartDate = customFilters?.startDate || startDate;
      const filterEndDate = customFilters?.endDate || endDate;
      const filterSelectedMonth = customFilters?.selectedMonth || selectedMonth;
      
      // Product filter
      const productMatch = filterProducts.includes('all') || 
                           (item.product_name && filterProducts.includes(item.product_name));
      
      // Retailer filter
      const retailerMatch = filterRetailers.includes('all') || 
                            (item.chain && filterRetailers.includes(item.chain));
      
      // Date filter
      let dateMatch = true;
      if (!isComparison) {
        // Primary date range
        if (filterDateRange === 'month' && filterSelectedMonth && item.month) {
          dateMatch = item.month === filterSelectedMonth;
        } else if (filterDateRange === 'custom' && filterStartDate && filterEndDate && item.receipt_date) {
          dateMatch = item.receipt_date >= filterStartDate && item.receipt_date <= filterEndDate;
        }
      } else {
        // Comparison date range
        if (comparisonDateRange === 'month' && comparisonMonth && item.month) {
          dateMatch = item.month === comparisonMonth;
        } else if (comparisonDateRange === 'custom' && comparisonStartDate && comparisonEndDate && item.receipt_date) {
          dateMatch = item.receipt_date >= comparisonStartDate && item.receipt_date <= comparisonEndDate;
        }
      }
      
      return productMatch && retailerMatch && dateMatch;
    });
  } catch (e) {
    console.error("Error in getFilteredData:", e);
    return [];
  }
}, [
  salesData, 
  selectedProducts, 
  selectedRetailers, 
  dateRange, 
  selectedMonth, 
  startDate, 
  endDate,
  comparisonDateRange,
  comparisonMonth,
  comparisonStartDate,
  comparisonEndDate
]);