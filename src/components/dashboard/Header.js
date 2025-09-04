// src/components/dashboard/Header.js
import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import ThemeToggle from '../ThemeToggle';
import Papa from 'papaparse';
import logo from '../../assets/unnamed-ezgif.com-webp-to-jpg-converter.jpg';

const Header = () => {
  const fileInputRef = useRef(null);
  const [processingFile, setProcessingFile] = useState(false);
  
  // Get data context
  const { 
    salesData,
    offerData,
    clientName,
    dataLoading,
    setDataLoading,
    setSalesData,
    setOfferData,
    setHasOfferData,
    setDataError,
    setBrandMapping,
    setBrandNames,
    setActiveTab,
    clearData
  } = useData();
  
  // Enhanced file processing with validation and correction
  const processFile = (file) => {
    if (!file) {
      setDataError('No file selected');
      return;
    }
    
    setDataLoading(true);
    setProcessingFile(true);
    setDataError('');
    
    // Check if we're dealing with sales or offer data
    const isOfferData = file.name.toLowerCase().includes('hits_offer');
    const dataType = isOfferData ? 'offers' : 'sales';
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        Papa.parse(e.target.result, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            
            if (results.data && results.data.length > 0) {
              // Process data directly without validation
              processValidatedData(results.data, dataType);
            } else {
              setDataError('No data found in file');
            }
            
            setDataLoading(false);
            setProcessingFile(false);
          },
          error: (error) => {
            console.error("CSV parsing error:", error);
            setDataError('Error parsing file: ' + error.message);
            setDataLoading(false);
            setProcessingFile(false);
          }
        });
      } catch (e) {
        console.error("Error in file upload handler:", e);
        setDataError('Error processing file: ' + e.message);
        setDataLoading(false);
        setProcessingFile(false);
      }
    };
    
    reader.onerror = (e) => {
      console.error("File read error:", e);
      setDataError('Error reading file');
      setDataLoading(false);
      setProcessingFile(false);
    };
    
    reader.readAsText(file);
  };
  
  // Clear all data with confirmation
  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      clearData();
    }
  };

  // Process data with automatic cleaning
  const processValidatedData = (data, dataType) => {
    // Remove completely empty rows
    const cleanedData = data.filter(row => {
      if (!row || typeof row !== 'object') return false;
      // Check if row has any non-empty values
      return Object.values(row).some(value => 
        value !== null && value !== undefined && value !== '' && String(value).trim() !== ''
      );
    });
    if (dataType === 'offers') {
      // Process offer data
      const processedOfferData = cleanedData.map(row => {
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
      setActiveTab('offers');
    } else {
      // Process sales data with enhanced date processing and validation
      const processedData = cleanedData.map(row => {
        try {
          if (!row.receipt_date) return row;
          
          const date = new Date(row.receipt_date);
          
          // Validate date is reasonable (not before 1990 or after current date + 1 year)
          const minDate = new Date('1990-01-01');
          const maxDate = new Date();
          maxDate.setFullYear(maxDate.getFullYear() + 1);
          
          if (isNaN(date.getTime()) || date < minDate || date > maxDate) {
            console.warn('Invalid date detected:', row.receipt_date, 'in row:', row);
            return row; // Keep original row if date is invalid
          }
          
          return {
            ...row,
            receipt_date: date.toISOString().split('T')[0],
            month: date.toISOString().slice(0, 7), // YYYY-MM format
            day_of_week: date.getDay(), // 0 = Sunday, 6 = Saturday
            hour_of_day: date.getHours() // 0-23
          };
        } catch (e) {
          console.error("Error processing row:", row, e);
          return row;
        }
      });
      
      setSalesData(processedData);
      setActiveTab('summary');
      
      // Auto-detect and set brand mapping
      const productNames = processedData.map(row => row.product_name).filter(Boolean);
      const detectedBrands = autoDetectBrands(productNames);
      setBrandMapping(detectedBrands);
      setBrandNames(Object.keys(detectedBrands));
    }
  };

  // Auto-detect brand names from product names
  const autoDetectBrands = (productNames) => {
    const brandMap = {};
    const brandCounts = {};
    
    productNames.forEach(productName => {
      if (!productName) return;
      
      // Extract potential brand (first word, normalized)
      const words = productName.toLowerCase().trim().split(/\s+/);
      const potentialBrand = words[0];
      
      if (potentialBrand && potentialBrand.length > 1) {
        brandCounts[potentialBrand] = (brandCounts[potentialBrand] || 0) + 1;
      }
    });
    
    // Only include brands that appear multiple times
    Object.entries(brandCounts).forEach(([brand, count]) => {
      if (count >= 2) {
        brandMap[brand] = brand.charAt(0).toUpperCase() + brand.slice(1);
      }
    });
    
    return brandMap;
  };

  
  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  return (
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
              <span className="text-xl font-semibold text-gray-900 dark:text-white">Sales Insights Dashboard</span>
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
            
            {/* Show simple data status */}
            {salesData && salesData.length > 0 ? (
              <span className="mr-4 text-sm text-green-600 dark:text-green-400 font-medium hidden md:block">
                {salesData.length.toLocaleString()} records loaded
              </span>
            ) : offerData && offerData.length > 0 ? (
              <span className="mr-4 text-sm text-green-600 dark:text-green-400 font-medium hidden md:block">
                {offerData.length.toLocaleString()} offer records loaded
              </span>
            ) : (
              <span className="mr-4 text-sm text-gray-500 dark:text-gray-400 font-medium hidden md:block">
                No data loaded
              </span>
            )}
            
            
            {/* Clear data button */}
            {(salesData.length > 0 || offerData.length > 0) && (
              <button
                onClick={handleClearAllData}
                className="mr-2 px-3 py-1 rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors"
                title="Clear all data"
              >
                <svg className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Data
              </button>
            )}
            
            {/* Upload button */}
            <div className="mr-2">
              <label 
                className="cursor-pointer bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-800/40 px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {processingFile || dataLoading ? 'Loading...' : 'Upload Data'}
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".csv" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
      
    </header>
  );
};

export default Header;
