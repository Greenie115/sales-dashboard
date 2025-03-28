import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator
import { identifyBrandPrefixes, extractBrandNames } from '../utils/brandDetection';
import supabase from '../utils/supabase'; // Import supabase utils

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

  // State for Supabase Storage ID
  const [currentDatasetStorageId, setCurrentDatasetStorageId] = useState(null);
  const isUploadingRef = useRef(false); // Ref to prevent duplicate uploads

  // Added from FilterContext: Filter UI state
  const [isFilterPanelCollapsed, setIsFilterPanelCollapsed] = useState(false);

  const [excludedDates, setExcludedDates] = useState(() => {
    const saved = localStorage.getItem('excludedDates');
    return saved ? JSON.parse(saved) : [];
  });

  // Helper function to upload raw data (defined before handleFileUpload)
  const uploadRawDataToStorage = useCallback(async (data, type) => {
    if (!supabase.isAvailable()) {
      console.warn("Supabase not available, skipping data upload.");
      return null;
    }
    if (!data || data.length === 0) {
      console.warn("No data provided to upload.");
      return null;
    }

    try {
      const jsonDataString = JSON.stringify(data);
      const jsonBlob = new Blob([jsonDataString], { type: 'application/json' });
      const filePath = `datasets/${type}-${uuidv4()}.json`; // Unique path

      console.log(`Uploading ${type} to ${filePath}...`);
      const { data: uploadData, error: uploadError } = await supabase.uploadToStorage(
        'raw-datasets', // Bucket name (ensure this exists in Supabase)
        filePath,
        jsonBlob,
        { upsert: false } // Don't upsert, always create new
      );

      if (uploadError) {
        throw uploadError;
      }

      if (uploadData && uploadData.path) {
        return uploadData.path; // Return the storage path/ID
      } else {
        throw new Error("Upload completed but no path returned.");
      }
    } catch (error) {
      console.error(`Error uploading ${type} to Supabase Storage:`, error);
      setError(`Failed to save ${type} for sharing: ${error.message}`); // Use setError from DataProvider state
      return null;
    }
  }, [setError]); // Depend on setError

  // Process uploaded file
  const handleFileUpload = useCallback((file) => {
    if (!file) {
      setError('No file selected');
      return;
    }
    
    console.log("Processing file:", file.name);
    if (isUploadingRef.current) {
      console.warn("Upload already in progress, skipping.");
      return;
    }
    
    console.log("Processing file:", file.name);
    setLoading(true);
    setError('');
    setCurrentDatasetStorageId(null); // Reset storage ID on new upload
    isUploadingRef.current = true; // Set upload flag

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

                  // Upload Offer Data to Supabase Storage
                  uploadRawDataToStorage(processedOfferData, 'offer-data')
                    .then(storageId => {
                      if (storageId) {
                        setCurrentDatasetStorageId(storageId);
                        console.log("Offer data uploaded to storage:", storageId);
                      } else {
                        // Handle case where upload resolved but returned no ID
                        console.error("Offer data upload resolved but no storage ID returned.");
                        setError("Storage upload succeeded but failed to return an ID.");
                      }
                    })
                    .catch(err => {
                      console.error("Failed to upload offer data:", err);
                      setError(`Storage upload failed: ${err.message || 'Unknown error'}`); // Set specific error
                    })
                    .finally(() => {
                      isUploadingRef.current = false; // Clear upload flag
                      setLoading(false); // Ensure loading is false after upload attempt
                    });

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
                    // Process brand detection
                    const uniqueProducts = _.uniq(processedData.map(item => item.product_name)).filter(Boolean);
                    console.log("Unique products:", uniqueProducts.length);
                    
                    const mapping = identifyBrandPrefixes(uniqueProducts);
                    setBrandMapping(mapping);
                    
                    // After setting brandNames
                    const brands = extractBrandNames(mapping);
                    console.log("Detected brands:", brands);
                    setBrandNames(brands);
                  
                    // Set client name to detected brand names if no custom client name has been set
                    if (brands && brands.length > 0) {
                      const brandClientName = brands.join(', ');
                      if (!clientName) { // Only update if no custom client name exists
                        setClientName(brandClientName);
                        console.log("Setting client name from brands:", brandClientName);
                      } else {
                        console.log("Keeping existing client name:", clientName);
                      }
                    }
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

                  // Upload Sales Data to Supabase Storage
                  uploadRawDataToStorage(processedData, 'sales-data')
                    .then(storageId => {
                      if (storageId) {
                        setCurrentDatasetStorageId(storageId);
                        console.log("Sales data uploaded to storage:", storageId);
                      } else {
                        // Handle case where upload resolved but returned no ID
                        console.error("Sales data upload resolved but no storage ID returned.");
                        setError("Storage upload succeeded but failed to return an ID.");
                      }
                    })
                    .catch(err => {
                      console.error("Failed to upload sales data:", err);
                      setError(`Storage upload failed: ${err.message || 'Unknown error'}`); // Set specific error
                    })
                    .finally(() => {
                      isUploadingRef.current = false; // Clear upload flag
                      setLoading(false); // Ensure loading is false after upload attempt
                    });

                }
              }
            } else {
              setError('No data found in file');
              setLoading(false); // Stop loading if no data
              isUploadingRef.current = false; // Clear upload flag
            }
            // setLoading(false); // Moved to finally block of upload
          },
          error: (error) => {
            console.error("CSV parsing error:", error);
            setError('Error parsing file: ' + error.message);
            setLoading(false);
            isUploadingRef.current = false; // Clear upload flag
          }
        });
      } catch (e) {
        console.error("Error in file upload handler:", e);
        setError('Error processing file: ' + e.message);
        setLoading(false);
        isUploadingRef.current = false; // Clear upload flag
      }
    };

    reader.onerror = (e) => {
      console.error("File read error:", e);
      setError('Error reading file');
      setLoading(false);
      isUploadingRef.current = false; // Clear upload flag
    };

    reader.readAsText(file);
  }, [uploadRawDataToStorage, clientName]); // Added clientName dependency

  // Get filtered data based on selections
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
    setCurrentDatasetStorageId(null); // Clear storage ID on data clear
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

  // ============ Functions migrated from FilterContext =============
  
  // Toggle filter panel (from FilterContext)
  const toggleFilterPanel = useCallback(() => {
    setIsFilterPanelCollapsed(prev => !prev);
  }, []);

  // Format month for display (from FilterContext)
  const formatMonth = useCallback((monthStr) => {
    try {
      if (!monthStr) return '';
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    } catch (e) {
      return monthStr || '';
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('excludedDates', JSON.stringify(excludedDates));
  }, [excludedDates]);

  // Create the filter state object to expose to consumers (like FilterContext did)
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
    setDarkMode,
    excludedDates,
    setExcludedDates,
    
    // FilterContext functionality
    isFilterPanelCollapsed,
    toggleFilterPanel,
    formatMonth,
    filters, // Expose filters object for backward compatibility
    currentDatasetStorageId, // Expose the storage ID
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;
