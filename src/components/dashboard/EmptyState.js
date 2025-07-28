// src/components/dashboard/EmptyState.js
import React, { useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import Papa from 'papaparse';

const EmptyState = () => {
  const fileInputRef = useRef(null);
  // Corrected destructuring using setDataLoading and setDataError
  const { 
    setDataLoading, 
    setSalesData, 
    setOfferData, 
    setHasOfferData, 
    setDataError,
    setBrandMapping,
    setBrandNames,
    setActiveTab
  } = useData();
  const [processingFile, setProcessingFile] = useState(false);

  // Enhanced file processing with validation and correction
  const processFile = (file) => {
    if (!file) {
      setDataError('No file selected');
      return;
    }
    
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
            if (results.errors && results.errors.length > 0) {
              console.warn('CSV parsing warnings:', results.errors);
            }
            
            if (results.data && results.data.length > 0) {
              // Process data directly without validation
              processValidatedData(results.data, dataType);
            } else {
              setDataError('No data found in file');
            }
            
            setProcessingFile(false);
          },
          error: (error) => {
            console.error("CSV parsing error:", error);
            setDataError('Error parsing file: ' + error.message);
            setProcessingFile(false);
          }
        });
      } catch (e) {
        console.error("Error in file upload handler:", e);
        setDataError('Error processing file: ' + e.message);
        setProcessingFile(false);
      }
    };
    
    reader.onerror = () => {
      setDataError('Error reading file');
      setProcessingFile(false);
    };
    
    reader.readAsText(file);
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
    setDataLoading(true);
    
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
    
    setDataLoading(false);
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
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12">
      <div className="text-center">
        <svg 
          className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 48 48" 
          aria-hidden="true"
        >
          <path 
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No data loaded</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Get started by uploading a CSV file with your sales or offer data.
        </p>
        <div className="mt-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 dark:focus:ring-offset-gray-800"
            disabled={processingFile}
          >
            <svg 
              className="-ml-1 mr-2 h-5 w-5" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
              />
            </svg>
            {processingFile ? 'Processing...' : 'Upload CSV'}
          </button>
          <input 
            type="file" 
            className="hidden" 
            accept=".csv" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          For sales analysis, upload a file with transaction data.<br />
          For offer insights, upload a file with offer engagement data.<br />
          <span className="font-medium">Files will be processed automatically.</span>
        </p>
      </div>
    </div>
  );
};

export default EmptyState;
