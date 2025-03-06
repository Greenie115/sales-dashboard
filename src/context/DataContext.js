import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { identifyBrandPrefixes, extractBrandNames } from '../utils/brandDetection';

// Create context
const DataContext = createContext();

// Custom hook to use the data context
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  // State for data management
  const [salesData, setSalesData] = useState([]);
  const [offerData, setOfferData] = useState([]);
  const [hasOfferData, setHasOfferData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [brandMapping, setBrandMapping] = useState({});
  const [brandNames, setBrandNames] = useState([]);
  const [clientName, setClientName] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  
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

  // Active tab state
  const [activeTab, setActiveTab] = useState('summary');

  // Debug info
  useEffect(() => {
    console.log("DataContext initialized");
    console.log("Selected products:", selectedProducts);
    console.log("Selected retailers:", selectedRetailers);
  }, [selectedProducts, selectedRetailers]);

  // Process uploaded file
  const handleFileUpload = useCallback((file) => {
    if (!file) {
      setError('No file selected');
      return;
    }
    
    console.log("Processing file:", file.name);
    setLoading(true);
    setError('');
    
    // Check if we're dealing with sales or offer data
    const isOfferData = file.name.toLowerCase().includes('hits_offer');
    console.log("Is offer data:", isOfferData);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        Papa.parse(e.target.result, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log("File parsed, rows:", results.data?.length);
            console.log("First row sample:", results.data[0]);
            
            if (results.data && results.data.length > 0) {
              if (isOfferData) {
                // Process offer data
                const validOfferData = results.data.filter(row => 
                  row && row.hit_id !== undefined
                );
                
                console.log("Valid offer data rows:", validOfferData.length);
                
                if (validOfferData.length === 0) {
                  setError('No valid offer data found. Please ensure your CSV has the correct format.');
                } else {
                  // Process dates for offer data
                  const processedOfferData = validOfferData.map(row => {
                    if (row.created_at) {
                      try {
                        const date = new Date(row.created_at);
                        return {
                          ...row,
                          created_at: !isNaN(date) ? date.toISOString() : row.created_at
                        };
                      } catch (e) {
                        return row;
                      }
                    }
                    return row;
                  });
                  
                  setOfferData(processedOfferData);
                  setHasOfferData(true);
                  console.log("Offer data processed successfully", processedOfferData.length);
                  
                  // Set active tab to offers
                  setActiveTab('offers');
                }
              } else {
                // Process sales data
                const validData = results.data.filter(row => 
                  row && 
                  row.receipt_date && 
                  row.product_name &&
                  row.chain &&
                  !isNaN(new Date(row.receipt_date).getTime())
                );
                
                console.log("Valid sales data rows:", validData.length);
      
                if (validData.length === 0) {
                  setError('No valid sales data found. Please ensure your CSV has the correct format.');
                } else {
                  // Process dates and add month field
                  const processedData = validData.map(row => {
                    try {
                      const date = new Date(row.receipt_date);
                      return {
                        ...row,
                        receipt_date: date.toISOString().split('T')[0],
                        month: date.toISOString().slice(0, 7), // YYYY-MM format
                        day_of_week: date.getDay(), // 0 = Sunday, 6 = Saturday
                        hour_of_day: date.getHours() // 0-23
                      };
                    } catch (e) {
                      console.error("Error processing row:", row, e);
                      // Return the original row if date processing fails
                      return row;
                    }
                  });
                  
                  console.log("Processed data:", processedData.length);
                  setSalesData(processedData);
                  
                  // Process brand detection
                  try {
                    const uniqueProducts = _.uniq(processedData.map(item => item.product_name)).filter(Boolean);
                    console.log("Unique products:", uniqueProducts.length);
                    
                    const mapping = identifyBrandPrefixes(uniqueProducts);
                    setBrandMapping(mapping);
                    
                    const brands = extractBrandNames(mapping);
                    console.log("Detected brands:", brands);
                    setBrandNames(brands);
                  } catch (e) {
                    console.error("Error in brand detection:", e);
                  }
                  
                  // Set initial date range
                  try {
                    const dates = processedData.map(row => row.receipt_date).filter(Boolean);
                    if (dates.length > 0) {
                      const minDate = _.min(dates);
                      const maxDate = _.max(dates);
                      console.log("Date range:", minDate, "to", maxDate);
                      
                      setStartDate(minDate);
                      setEndDate(maxDate);
                      
                      // Initialize comparison dates
                      const minDateObj = new Date(minDate);
                      const maxDateObj = new Date(maxDate);
                      
                      // Calculate a comparable previous period (e.g., previous month)
                      const diffDays = Math.ceil((maxDateObj - minDateObj) / (1000 * 60 * 60 * 24));
                      const compEndDate = new Date(minDateObj);
                      compEndDate.setDate(compEndDate.getDate() - 1);
                      
                      const compStartDate = new Date(compEndDate);
                      compStartDate.setDate(compStartDate.getDate() - diffDays);
                      
                      setComparisonStartDate(compStartDate.toISOString().split('T')[0]);
                      setComparisonEndDate(compEndDate.toISOString().split('T')[0]);
                    }
                  } catch (e) {
                    console.error("Error setting date range:", e);
                  }
                  
                  // Initialize with all products selected
                  setSelectedProducts(['all']);
                  setSelectedRetailers(['all']);
                  setDateRange('all');
                  
                  // Set active tab to summary
                  setActiveTab('summary');
                  
                  console.log("Sales data processed successfully");
                }
              }
            } else {
              setError('No data found in file');
            }
            setLoading(false);
          },
          error: (error) => {
            console.error("CSV parsing error:", error);
            setError('Error parsing file: ' + error.message);
            setLoading(false);
          }
        });
      } catch (e) {
        console.error("Error in file upload handler:", e);
        setError('Error processing file: ' + e.message);
        setLoading(false);
      }
    };
    
    reader.onerror = (e) => {
      console.error("File read error:", e);
      setError('Error reading file');
      setLoading(false);
    };
    
    reader.readAsText(file);
  }, []);

  // Get filtered data based on selections
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

  // Calculate metrics for the filtered data
  const calculateMetrics = useCallback((isComparison = false) => {
    try {
      const filteredData = getFilteredData(isComparison);
      if (!filteredData || filteredData.length === 0) {
        return null;
      }
      const datesWithValues = filteredData
        .map(item => item.receipt_date)
        .filter(Boolean);
      const uniqueDates = _.uniq(datesWithValues).sort();
      const daysInRange = uniqueDates.length;
      const totalValue = filteredData.reduce((sum, item) => {
        return sum + (item.receipt_total || 0);
      }, 0);
      
      // Calculate average per day
      const avgPerDay = daysInRange > 0 ? filteredData.length / daysInRange : 0;
      
      return {
        totalUnits: filteredData.length,
        uniqueDates: uniqueDates,
        daysInRange: daysInRange,
        totalValue: totalValue,
        avgRedemptionsPerDay: avgPerDay.toFixed(1)
      };
    } catch (e) {
      console.error("Error in calculateMetrics:", e);
      return null;
    }
  }, [getFilteredData]);

  // Handle product selection
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

  // Handle retailer selection
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

  // Clear all data
  const clearData = useCallback(() => {
    setSalesData([]);
    setOfferData([]);
    setHasOfferData(false);
    setBrandMapping({});
    setBrandNames([]);
    setClientName('');
    setSelectedProducts(['all']);
    setSelectedRetailers(['all']);
    setDateRange('all');
    setActiveTab('summary');
  }, []);

  // Get retailer distribution data
  const getRetailerDistribution = useCallback(() => {
    try {
      const filteredData = getFilteredData();
      if (!filteredData || filteredData.length === 0) return [];
      
      const groupedByRetailer = _.groupBy(filteredData, 'chain');
      
      const totalUnits = filteredData.length;
      
      return Object.entries(groupedByRetailer)
        .map(([chain, items]) => ({
          name: chain || 'Unknown',
          value: items.length,
          percentage: (items.length / totalUnits) * 100
        }))
        .sort((a, b) => b.value - a.value);
    } catch (e) {
      console.error("Error in getRetailerDistribution:", e);
      return [];
    }
  }, [getFilteredData]);

  // Get product distribution
  const getProductDistribution = useCallback(() => {
    try {
      const filteredData = getFilteredData();
      if (!filteredData || filteredData.length === 0) return [];
      
      const groupedByProduct = _.groupBy(filteredData, 'product_name');
      
      return Object.entries(groupedByProduct)
        .map(([product, items]) => {
          // Use the mapping to get display name
          const productInfo = brandMapping[product] || { displayName: product };
          
          let displayName = productInfo.displayName || product;
          
          // ADDITIONAL FALLBACK: If the display name is still the full product name
          // and has 3+ words, force remove the first word(s)
          if (displayName === product) {
            const words = displayName.split(' ');
            if (words.length >= 3) {
              // Remove the first word (or two if the name is long)
              const wordsToRemove = words.length >= 5 ? 2 : 1;
              displayName = words.slice(wordsToRemove).join(' ');
            }
          }
          
          return {
            name: product, // Keep original name for data integrity
            displayName: displayName, // Use formatted name for display
            brandName: productInfo.brandName || '', // Store the brand name if needed
            count: items.length,
            percentage: (items.length / filteredData.length) * 100,
            value: items.reduce((sum, item) => sum + (item.receipt_total || 0), 0)
          };
        })
        .sort((a, b) => b.count - a.count);
    } catch (e) {
      console.error("Error in getProductDistribution:", e);
      return [];
    }
  }, [getFilteredData, brandMapping]);

  // Get available months from data
  const getAvailableMonths = useCallback(() => {
    try {
      if (!salesData || salesData.length === 0) return [];
      return _.uniq(salesData.map(item => item.month).filter(Boolean)).sort();
    } catch (e) {
      console.error("Error in getAvailableMonths:", e);
      return [];
    }
  }, [salesData]);

  // Check if we have data
  const hasData = salesData.length > 0 || hasOfferData;

  // Context value - IMPORTANT: Include all functions and state!
  const value = {
    salesData,
    offerData,
    hasOfferData,
    loading,
    error,
    brandMapping,
    brandNames,
    clientName,
    hasData,
    activeTab,
    setActiveTab,
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
    handleFileUpload,
    getFilteredData,
    calculateMetrics,
    handleProductSelection,
    handleRetailerSelection,
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
    clearData,
    getRetailerDistribution,
    getProductDistribution,
    getAvailableMonths,
    // Setter methods needed for components
    setSalesData,
    setOfferData,
    setHasOfferData,
    setLoading,
    setError,
    setBrandMapping,
    setBrandNames,
    setClientName,
    darkMode, 
    setDarkMode
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;