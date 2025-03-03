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
                  row && row.hit_id && row.offer_id
                );
                
                console.log("Valid offer data rows:", validOfferData.length);
                
                if (validOfferData.length === 0) {
                  setError('No valid offer data found. Please ensure your CSV has the correct format.');
                } else {
                  setOfferData(validOfferData);
                  setHasOfferData(true);
                  console.log("Offer data processed successfully");
                  
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
  const getFilteredData = useCallback((isComparison = false) => {
    if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
      console.log("getFilteredData: No data to filter");
      return [];
    }
    
    try {
      return salesData.filter(item => {
        if (!item) return false;
        
        // Product filter
        const productMatch = selectedProducts.includes('all') || 
                             (item.product_name && selectedProducts.includes(item.product_name));
        
        // Retailer filter
        const retailerMatch = selectedRetailers.includes('all') || 
                              (item.chain && selectedRetailers.includes(item.chain));
        
        // Date filter
        let dateMatch = true;
        if (!isComparison) {
          // Primary date range
          if (dateRange === 'month' && selectedMonth && item.month) {
            dateMatch = item.month === selectedMonth;
          } else if (dateRange === 'custom' && startDate && endDate && item.receipt_date) {
            dateMatch = item.receipt_date >= startDate && item.receipt_date <= endDate;
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
        console.log("calculateMetrics: No filtered data");
        return null;
      }
      
      // Get unique dates to calculate date range and average per day
      const datesWithValues = filteredData
        .map(item => item.receipt_date)
        .filter(Boolean);
      
      const uniqueDates = _.uniq(datesWithValues).sort();
      const daysInRange = uniqueDates.length;
      
      // Get total monetary value if available
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
    setSelectedProducts(['all']);
    setSelectedRetailers(['all']);
    setDateRange('all');
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

  // Calculate daily trend data (using simple moving average)
  const calculateTrendLine = useCallback((data, window = 7) => {
    if (!data || data.length < window) return [];
    
    try {
      const result = [];
      
      for (let i = 0; i < data.length; i++) {
        if (i < window - 1) {
          // Not enough data points yet for the window
          result.push(null);
        } else {
          // Calculate average of last 'window' points
          let sum = 0;
          for (let j = 0; j < window; j++) {
            sum += data[i - j].count;
          }
          result.push({
            name: data[i].name,
            trend: sum / window
          });
        }
      }
      
      return result;
    } catch (e) {
      console.error("Error in calculateTrendLine:", e);
      return [];
    }
  }, []);

  // Get redemptions over time based on selected timeframe
  const getRedemptionsOverTime = useCallback((timeframe = 'daily') => {
    try {
      const filteredData = getFilteredData();
      
      if (!filteredData || filteredData.length === 0) return [];
      
      let groupedData;
      let format;
      
      switch(timeframe) {
        case 'hourly':
          // Group by hour of day
          groupedData = _.groupBy(filteredData, 'hour_of_day');
          format = hour => `${hour}:00`;
          break;
        case 'daily':
          // Group by date
          groupedData = _.groupBy(filteredData, 'receipt_date');
          format = date => date;
          break;
        case 'weekly':
          // Group by week (using the first day of the week)
          groupedData = _.groupBy(filteredData, item => {
            if (!item.receipt_date) return 'unknown';
            try {
              const date = new Date(item.receipt_date);
              const dayOfWeek = date.getDay();
              const diff = date.getDate() - dayOfWeek; // adjust to get first day of week (Sunday)
              const firstDay = new Date(date.setDate(diff));
              return firstDay.toISOString().split('T')[0];
            } catch (e) {
              return 'unknown';
            }
          });
          format = date => {
            if (date === 'unknown') return 'Unknown';
            try {
              const startDate = new Date(date);
              const endDate = new Date(startDate);
              endDate.setDate(endDate.getDate() + 6);
              return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            } catch (e) {
              return date;
            }
          };
          break;
        case 'monthly':
        default:
          // Group by month
          groupedData = _.groupBy(filteredData, 'month');
          format = month => month || 'Unknown';
      }
      
      // Remove "unknown" key if present
      delete groupedData['unknown'];
      
      // Convert grouped data to array format for chart
      let result = Object.entries(groupedData)
        .map(([key, items]) => {
          // Calculate average value per receipt if available
          const avgValue = items.reduce((sum, item) => sum + (item.receipt_total || 0), 0) / items.length;
          
          return {
            name: format(key),
            count: items.length,
            value: items.reduce((sum, item) => sum + (item.receipt_total || 0), 0),
            avgValue: isNaN(avgValue) ? 0 : avgValue.toFixed(2)
          };
        });
      
      // Sort by the appropriate key
      if (timeframe === 'hourly') {
        // For hourly, sort by hour number
        result = result.sort((a, b) => parseInt(a.name) - parseInt(b.name));
      } else {
        // For other timeframes, sort by date/time
        result = result.sort((a, b) => a.name.localeCompare(b.name));
      }
      
      return result;
    } catch (e) {
      console.error("Error in getRedemptionsOverTime:", e);
      return [];
    }
  }, [getFilteredData]);

  // Check if we have data
  const hasData = salesData.length > 0 || hasOfferData;

  // Context value
  const value = {
    salesData,
    offerData,
    hasOfferData,
    loading,
    error,
    brandMapping,
    brandNames,
    clientName,
    setClientName,
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
    calculateTrendLine,
    getRedemptionsOverTime
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;