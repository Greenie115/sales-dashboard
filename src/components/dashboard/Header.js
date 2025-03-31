// src/components/dashboard/Header.js
import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useSharing } from '../../context/SharingContext';
import ThemeToggle from '../ThemeToggle';
import ShareButton from '../sharing/ShareButton';
import SharedDashboardsManager from '../sharing/SharedDashboardsManager';
import { Button, Icon } from '../ui';
import Papa from 'papaparse';
import logo from '../../assets/unnamed-ezgif.com-webp-to-jpg-converter.jpg'
import { useClientData } from '../../context/ClientDataContext';

const Header = () => {
  const { clientName } = useClientData();
  const { openDashboardManager, dashboardManagerOpen, closeDashboardManager } = useSharing();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [processingFile, setProcessingFile] = useState(false);
  
  // Get data context
  const { 
    salesData,
    offerData,
    hasData,
    loading,
    error,
    setLoading,
    setSalesData,
    setOfferData,
    setHasOfferData,
    setError,
    setBrandMapping,
    setBrandNames,
    setActiveTab,
    uploadDataToStorage,
    currentDatasetStorageId
  } = useData();
  
  // Define our own file processing logic
  const processFile = (file) => {
    if (!file) {
      setError('No file selected');
      return;
    }
    
    setLoading(true);
    setProcessingFile(true);
    setError('');
    
    // Check if we're dealing with sales or offer data
    const isOfferData = file.name.toLowerCase().includes('hits_offer');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        Papa.parse(e.target.result, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: async (results) => {
            
            if (results.data && results.data.length > 0) {
              if (isOfferData) {
                // Process offer data
                const validOfferData = results.data.filter(row => 
                  row && row.hit_id !== undefined
                );
                
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
                  
                  // Set offer data
                  setOfferData(processedOfferData);
                  setHasOfferData(true);
                  
                  // Set active tab to offers
                  setActiveTab('offers');
                  
                  // Upload data to storage for sharing
                  try {
                    await uploadDataToStorage(processedOfferData, 'offer');
                  } catch (uploadError) {
                    console.error("Error uploading offer data:", uploadError);
                    // Continue anyway - the error is already captured in the DataContext
                  }
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
                  
                  // Set sales data
                  setSalesData(processedData);
                  
                  // Upload data to storage for sharing
                  try {
                    await uploadDataToStorage(processedData, 'sales');
                  } catch (uploadError) {
                    console.error("Error uploading sales data:", uploadError);
                    // Continue anyway - the error is already captured in the DataContext
                  }
                  
                  // Set active tab to summary
                  setActiveTab('summary');
                }
              }
            } else {
              setError('No data found in file');
            }
            
            setLoading(false);
            setProcessingFile(false);
          },
          error: (error) => {
            console.error("CSV parsing error:", error);
            setError('Error parsing file: ' + error.message);
            setLoading(false);
            setProcessingFile(false);
          }
        });
      } catch (e) {
        console.error("Error in file upload handler:", e);
        setError('Error processing file: ' + e.message);
        setLoading(false);
        setProcessingFile(false);
      }
    };
    
    reader.onerror = (e) => {
      console.error("File read error:", e);
      setError('Error reading file');
      setLoading(false);
      setProcessingFile(false);
    };
    
    reader.readAsText(file);
  };
  
  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <>
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img 
                  src={logo} 
                  className="w-12 h-12 rounded-lg"
                  alt="Logo"
                />
                <div className="ml-2">
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">Insights Dashboard</span>
                  {clientName && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {clientName}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Actions and user menu */}
            <div className="flex items-center">
              {/* Dark mode toggle */}
              <div className="mr-4">
                <ThemeToggle />
              </div>
              
              {/* Show data status */}
              {salesData && salesData.length > 0 ? (
                <span className="mr-4 text-sm text-green-600 dark:text-green-400 font-medium hidden md:block">
                  {salesData.length} records loaded
                  {currentDatasetStorageId && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      (ID: {currentDatasetStorageId.substring(0, 8)}...)
                    </span>
                  )}
                </span>
              ) : offerData && offerData.length > 0 ? (
                <span className="mr-4 text-sm text-green-600 dark:text-green-400 font-medium hidden md:block">
                  {offerData.length} offer records loaded
                  {currentDatasetStorageId && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      (ID: {currentDatasetStorageId.substring(0, 8)}...)
                    </span>
                  )}
                </span>
              ) : (
                <span className="mr-4 text-sm text-gray-500 dark:text-gray-400 font-medium hidden md:block">
                  No data loaded
                </span>
              )}
              
              {/* Manage shared dashboards */}
              <div className="mr-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openDashboardManager}
                  icon={<Icon name="share" />}
                >
                  Manage Shared
                </Button>
              </div>
              
              {/* Share button - always show, but it will be disabled if no data */}
              <div className="mr-2">
                <ShareButton />
              </div>
              
              {/* Upload button */}
              <div className="mr-2">
                <label 
                  className={`cursor-pointer ${
                    processingFile || loading 
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400' 
                      : 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-800/40'
                  } px-3 py-2 rounded-md text-sm font-medium flex items-center`}
                  onClick={() => !processingFile && !loading && fileInputRef.current?.click()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {processingFile || loading ? 'Loading...' : 'Upload CSV'}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".csv" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    disabled={processingFile || loading}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Shared Dashboard Manager Modal */}
      <SharedDashboardsManager 
        isOpen={dashboardManagerOpen} 
        onClose={closeDashboardManager} 
      />
    </>
  );
};

export default Header;