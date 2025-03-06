// This is a fixed version of the getFilteredData function to fix eslint errors

const getFilteredData = useCallback((arg1, arg2) => {
  // For backward compatibility - handle different parameter patterns
  let customFilters = null;
  let isComparison = false;
  
  // Check if arg1 is a boolean (old usage)
  if (typeof arg1 === 'boolean') {
    isComparison = arg1;
  } 
  // Check if arg1 is custom filters
  else if (arg1 && typeof arg1 === 'object') {
    customFilters = arg1;
    if (arg1.isComparison) {
      isComparison = true;
    }
  }
  
  // If arg2 is provided and is a boolean, it's isComparison
  if (typeof arg2 === 'boolean') {
    isComparison = arg2;
  }
  
  if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
    console.log("getFilteredData: No data to filter");
    return [];
  }
  
  try {
    return salesData.filter(item => {
      if (!item) return false;
      
      // Get the filters to use (either custom or from context state)
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