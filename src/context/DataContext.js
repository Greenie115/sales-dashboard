import React, { createContext, useState, useContext, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { useDashboard } from './DashboardContext';
import { identifyBrandPrefixes, extractBrandNames } from '../utils/brandDetection';

// Create context
const DataContext = createContext();

// Custom hook for using this context
export const useData = () => useContext(DataContext);

// Provider component
export const DataProvider = ({ children }) => {
  const { setLoading, setError, setBrandNames } = useDashboard();
  
  // Data state
  const [data, setData] = useState([]);
  const [offerData, setOfferData] = useState([]);
  const [hasOfferData, setHasOfferData] = useState(false);
  const [brandMapping, setBrandMapping] = useState({});
  const [processedData, setProcessedData] = useState(null);
  
  // Calculate derived data whenever primary data changes
  useEffect(() => {
    if (data.length > 0) {
      calculateProcessedData();
    }
  }, [data]);
  
  // Calculate processed data for charts and analysis
  const calculateProcessedData = () => {
    // This function will calculate derived data used by multiple components
    // For now, it's a placeholder - we'll implement the actual calculations later
    setProcessedData({
      // Example processed data structure
      metrics: calculateMetrics(),
      retailerDistribution: getRetailerDistribution(),
      productDistribution: getProductDistribution(),
      redemptionsOverTime: getRedemptionsOverTime('daily')
    });
  };
  
  // Handle file upload
  const handleFileUpload = (event) => {
    setLoading(true);
    setError('');
    const file = event.target.files[0];
    
    if (file) {
      // Check file type based on name
      const isOfferData = file.name.toLowerCase().includes('hits_offer');
      
      // Reset previous data if switching file types
      if (isOfferData) {
        // If uploading offer data
        if (data.length > 0 && !hasOfferData) {
          // Keep sales data if already loaded, just add offer data
        } else {
          // Clear sales data if we're only working with offer data
          setData([]);
        }
      } else {
        // If uploading sales data, clear offer data
        setOfferData([]);
        setHasOfferData(false);
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        Papa.parse(e.target.result, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              if (isOfferData) {
                processOfferData(results.data);
              } else {
                processSalesData(results.data);
              }
            } else {
              setError('No data found in file');
            }
            setLoading(false);
          },
          error: (error) => {
            setError('Error parsing file: ' + error.message);
            setLoading(false);
          }
        });
      };
      reader.onerror = () => {
        setError('Error reading file');
        setLoading(false);
      };
      reader.readAsText(file);
    } else {
      setError('Please select a file');
      setLoading(false);
    }
  };
  
  // Process sales data
  const processSalesData = (rawData) => {
    // Process sales data
    const validData = rawData.filter(row => 
      row.receipt_date && 
      row.product_name &&
      row.chain &&
      !isNaN(new Date(row.receipt_date).getTime())
    );
    
    if (validData.length === 0) {
      setError('No valid sales data found. Please ensure your CSV has the correct format.');
      return;
    }
    
    // Process dates and add month field
    const processedData = validData.map(row => {
      const date = new Date(row.receipt_date);
      return {
        ...row,
        receipt_date: date.toISOString().split('T')[0],
        month: date.toISOString().slice(0, 7), // YYYY-MM format
        day_of_week: date.getDay(), // 0 = Sunday, 6 = Saturday
        hour_of_day: date.getHours() // 0-23
      };
    });
    
    setData(processedData);
    
    // Use the BrandDetection utility
    const uniqueProducts = _.uniq(processedData.map(item => item.product_name)).filter(Boolean);
    const mapping = identifyBrandPrefixes(uniqueProducts);
    setBrandMapping(mapping);
    const brands = extractBrandNames(mapping);
    setBrandNames(brands);
  };
  
  // Process offer data
  const processOfferData = (rawData) => {
    // Process offer data
    const validOfferData = rawData.filter(row => 
      row.hit_id && row.offer_id
    );
    
    if (validOfferData.length === 0) {
      setError('No valid offer data found. Please ensure your CSV has the correct format.');
      return;
    }
    
    setOfferData(validOfferData);
    setHasOfferData(true);
  };
  
  // Get filtered data (will be moved to FilterContext in the full implementation)
  const getFilteredData = (filters = {}) => {
    // This is a placeholder - the actual filtering logic will be implemented in FilterContext
    return data;
  };
  
  // Calculate metrics
  const calculateMetrics = () => {
    if (!data.length) return null;
    
    const filteredData = getFilteredData();
    
    // Get unique dates to calculate date range and average per day
    const uniqueDates = _.uniq(filteredData.map(item => item.receipt_date)).sort();
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
  };
  
  // Get retailer distribution
  const getRetailerDistribution = () => {
    const filteredData = getFilteredData();
    const groupedByRetailer = _.groupBy(filteredData, 'chain');
    
    const totalUnits = filteredData.length;
    
    return Object.entries(groupedByRetailer)
      .map(([chain, items]) => ({
        name: chain || 'Unknown',
        value: items.length,
        percentage: (items.length / totalUnits) * 100
      }))
      .sort((a, b) => b.value - a.value);
  };
  
  // Get product distribution
  const getProductDistribution = () => {
    const filteredData = getFilteredData();
    
    if (!filteredData.length) return [];
    
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
  };
  
  // Get redemptions over time
  const getRedemptionsOverTime = (timeframe = 'daily') => {
    const filteredData = getFilteredData();
    
    if (!filteredData.length) return [];
    
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
          const date = new Date(item.receipt_date);
          const dayOfWeek = date.getDay();
          const diff = date.getDate() - dayOfWeek; // adjust to get first day of week (Sunday)
          const firstDay = new Date(date.setDate(diff));
          return firstDay.toISOString().split('T')[0];
        });
        format = date => {
          const startDate = new Date(date);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
          return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        };
        break;
      case 'monthly':
      default:
        // Group by month
        groupedData = _.groupBy(filteredData, 'month');
        format = month => month;
    }
    
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
  };
  
  return (
    <DataContext.Provider value={{
      // State
      data,
      offerData,
      hasOfferData,
      brandMapping,
      processedData,
      
      // Methods
      handleFileUpload,
      getFilteredData,
      calculateMetrics,
      getRetailerDistribution,
      getProductDistribution,
      getRedemptionsOverTime
    }}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;