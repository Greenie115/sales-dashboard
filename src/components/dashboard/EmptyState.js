import React, { useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import Papa from 'papaparse';

const EmptyState = () => {
  const fileInputRef = useRef(null);
  const { 
    setDataLoading, 
    setSalesData, 
    setOfferData, 
    setHasOfferData, 
    setDataError,
    setBrandMapping,
    setBrandNames,
    setActiveTab,
    setCampaignData
  } = useData();
  const [processingFile, setProcessingFile] = useState(false);

  // Enhanced file processing with validation and correction
  const processFile = (file) => {
    if (!file) {
      setDataError('No file selected');
      return;
    }
    
    // Check file size (warn if > 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setDataError('File is too large (>50MB). Please use a smaller file or contact support for large dataset handling.');
      return;
    }
    
    setProcessingFile(true);
    setDataError('');
    setDataLoading(true);
    
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
            try {
              if (results.errors && results.errors.length > 0) {
                console.warn('CSV parsing warnings:', results.errors);
              }
              
              if (results.data && results.data.length > 0) {
                // Process data with error handling
                processValidatedData(results.data, dataType, file);
              } else {
                setDataError('No valid data found in file. Please check that your CSV has headers and data rows.');
                setDataLoading(false);
                setProcessingFile(false);
              }
            } catch (error) {
              console.error("Error processing parsed data:", error);
              setDataError('Error processing data: ' + error.message);
              setDataLoading(false);
              setProcessingFile(false);
            }
          },
          error: (error) => {
            console.error("CSV parsing error:", error);
            setDataError('Error parsing file: ' + error.message + '. Please check that your file is a valid CSV.');
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
    
    reader.onerror = () => {
      setDataError('Error reading file. Please try again or use a different file.');
      setDataLoading(false);
      setProcessingFile(false);
    };
    
    reader.readAsText(file);
  };

  // Process data with automatic cleaning
  const processValidatedData = (data, dataType, file) => {
    try {
      // Remove completely empty rows
      const cleanedData = data.filter(row => {
        if (!row || typeof row !== 'object') return false;
        // Check if row has any non-empty values
        return Object.values(row).some(value => 
          value !== null && value !== undefined && value !== '' && String(value).trim() !== ''
        );
      });
      
      if (cleanedData.length === 0) {
        setDataError('No valid data rows found in file. Please check your CSV format.');
        setDataLoading(false);
        setProcessingFile(false);
        return;
      }
    
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
          
          // Only call toISOString if date is valid
          const isoString = date.toISOString();
          return {
            ...row,
            receipt_date: isoString.split('T')[0],
            month: isoString.slice(0, 7), // YYYY-MM format
            day_of_week: date.getDay(), // 0 = Sunday, 6 = Saturday
            hour_of_day: date.getHours() // 0-23
          };
        } catch (e) {
          console.error("Error processing row:", row, e);
          return row; // Return original row on any error
        }
      });
      
      setSalesData(processedData);
      setActiveTab('summary');
      
      // Auto-detect and set brand mapping
      const productNames = processedData.map(row => row.product_name).filter(Boolean);
      const detectedBrands = autoDetectBrands(productNames);
      setBrandMapping(detectedBrands);
      setBrandNames(Object.keys(detectedBrands));
      
      // Save to primary dataset
      const metadata = {
        name: 'Sales Data',
        fileName: file.name || 'upload.csv',
        uploadDate: new Date().toISOString(),
        brandMapping: detectedBrands,
        recordCount: processedData.length,
        dateRange: {
          start: processedData.length > 0 ? processedData
            .map(row => row.receipt_date)
            .filter(Boolean)
            .map(dateStr => new Date(dateStr).getTime())
            .filter(timestamp => !isNaN(timestamp))
            .reduce((min, timestamp) => Math.min(min, timestamp), Infinity) : null,
          end: processedData.length > 0 ? processedData
            .map(row => row.receipt_date)
            .filter(Boolean)
            .map(dateStr => new Date(dateStr).getTime())
            .filter(timestamp => !isNaN(timestamp))
            .reduce((max, timestamp) => Math.max(max, timestamp), -Infinity) : null
        }
      };
      setCampaignData('A', processedData, metadata);
    }
    
    setDataLoading(false);
    setProcessingFile(false);
    
    } catch (error) {
      console.error("Critical error in data processing:", error);
      setDataError('Critical error processing your data: ' + error.message + '. Please check your file format.');
      setDataLoading(false);
      setProcessingFile(false);
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
    <div className="space-y-6">      
      {/* Main Upload Interface */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <svg 
            className="mx-auto h-20 w-20 text-pink-400 dark:text-pink-500" 
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
          <h3 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Upload Your Sales Data</h3>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Get instant insights from your items purchased file. Upload your CSV to see sales analytics, demographics, and performance metrics.
          </p>
          <div className="mt-8">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-6 py-3 border border-transparent text-lg font-medium rounded-lg text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 dark:focus:ring-offset-gray-800 shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={processingFile}
            >
              <svg 
                className="-ml-1 mr-3 h-6 w-6" 
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
              {processingFile ? 'Processing your file...' : 'Choose CSV File'}
            </button>
            <input 
              type="file" 
              className="hidden" 
              accept=".csv" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            <p className="mb-2">Supported format: CSV files with sales or offer data</p>
            <p className="text-xs">Once uploaded, you'll see comprehensive analytics and have the option to compare with additional datasets</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
