// src/context/DataContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import dataUploadService from '../services/dataUploadService';

// Create context
const DataContext = createContext();

// Provider component
export const DataProvider = ({ children }) => {
  // State for sales data
  const [salesData, setSalesData] = useState([]);
  const [offerData, setOfferData] = useState([]);
  const [hasOfferData, setHasOfferData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Brand-related state
  const [brandMapping, setBrandMapping] = useState({});
  const [brandNames, setBrandNames] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('summary');
  const [clientName, setClientName] = useState('');
  const [hiddenCharts, setHiddenCharts] = useState([]);
  
  // Filtering state
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedProducts, setSelectedProducts] = useState(['all']);
  const [selectedRetailers, setSelectedRetailers] = useState(['all']);
  
  // Storage ID for sharing
  const [currentDatasetStorageId, setCurrentDatasetStorageId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Calculate filtered data based on selected filters
  const getFilteredData = () => {
    // Implementation would go here
    return salesData;
  };
  
  // Calculate metrics from filtered data
  const calculateMetrics = () => {
    // Implementation would go here
    return {
      totalUnits: salesData.length,
      // Add other metrics as needed
    };
  };
  
  // Upload data to storage for sharing
  const uploadDataToStorage = async (dataToUpload, type) => {
    setLoading(true);
    setError(null);
    
    try {
      // Upload the data using the service
      const storageId = await dataUploadService.uploadData(dataToUpload, type);
      
      // Set the storage ID in state
      setCurrentDatasetStorageId(storageId);
      
      console.log(`Data uploaded with storage ID: ${storageId}`);
      return storageId;
    } catch (err) {
      console.error('Error uploading data:', err);
      setError(`Failed to upload data: ${err.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Effect to upload data whenever salesData changes
  useEffect(() => {
    // Only upload if there's data and no current storage ID
    if (salesData && salesData.length > 0 && !currentDatasetStorageId) {
      console.log('Auto-uploading new sales data...');
      uploadDataToStorage(salesData, 'sales')
        .then(id => console.log('Auto-upload complete, storage ID:', id))
        .catch(err => console.error('Auto-upload failed:', err));
    }
  }, [salesData]);
  
  // Check if data is available
  const hasData = salesData && salesData.length > 0;
  
  // Define the context value
  const contextValue = {
    salesData,
    offerData,
    hasOfferData,
    loading,
    error,
    brandMapping,
    brandNames,
    activeTab,
    clientName,
    hiddenCharts,
    dateRange,
    startDate,
    endDate,
    selectedMonth,
    selectedProducts,
    selectedRetailers,
    currentDatasetStorageId,
    uploadProgress,
    hasData,
    
    // Methods
    setSalesData,
    setOfferData,
    setHasOfferData,
    setLoading,
    setError,
    setBrandMapping,
    setBrandNames,
    setActiveTab,
    setClientName,
    setHiddenCharts,
    setDateRange,
    setStartDate,
    setEndDate,
    setSelectedMonth,
    setSelectedProducts,
    setSelectedRetailers,
    getFilteredData,
    calculateMetrics,
    uploadDataToStorage,
  };
  
  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

// Custom hook for using the data context
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};