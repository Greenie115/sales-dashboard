import React, { useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import Papa from 'papaparse';
import LoadingSpinner from '../common/LoadingSpinner';

const EmptyState = () => {
  const fileInputRef = useRef(null);
  
  // Auto-focus the file input when component mounts
  React.useEffect(() => {
    // Delay focus slightly to ensure page is ready
    const timer = setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.focus();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  const { 
    setDataLoading, 
    setSalesData, 
    setOfferData, 
    setHasOfferData, 
    setDataError,
    setActiveTab,
    setCampaignData
  } = useData();
  const [processingFile, setProcessingFile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

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
      
      
      // Save to primary dataset
      const metadata = {
        name: 'Sales Data',
        fileName: file.name || 'upload.csv',
        uploadDate: new Date().toISOString(),
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



  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle drag and drop events
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
        processFile(file);
      } else {
        setDataError('Please upload a CSV file only');
      }
    }
  };


  return (
    <div className="space-y-6">      
      {/* Main Upload Interface */}
      <div 
        className={`bg-white dark:bg-gray-800 shadow rounded-lg p-12 border-2 transition-all duration-200 ${
          isDragOver 
            ? 'border-pink-400 dark:border-pink-500 bg-pink-50 dark:bg-pink-900/10 scale-[1.02]' 
            : 'border-dashed border-gray-300 dark:border-gray-600 hover:border-pink-300 dark:hover:border-pink-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
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
          <h3 className={`mt-6 text-2xl font-bold transition-colors ${
            isDragOver ? 'text-pink-600 dark:text-pink-400' : 'text-gray-900 dark:text-white'
          }`}>
            {isDragOver ? 'Drop CSV file here' : 'Upload Sales Data'}
          </h3>
          <p className={`mt-4 text-base max-w-sm mx-auto transition-colors ${
            isDragOver 
              ? 'text-pink-700 dark:text-pink-300' 
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            {isDragOver 
              ? 'Release to upload' 
              : 'Drop your CSV file or click to browse'
            }
          </p>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            <p className="mb-2">📊 <strong>Get started:</strong> Upload your sales data to see analytics</p>
            <p className="mb-2">📈 <strong>Compare campaigns:</strong> Upload multiple files for comparison</p>
            <p>💡 <strong>Tip:</strong> Files with 'hits_offer' in the name are treated as offer data</p>
          </div>
          <div className="mt-8">
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-lg font-medium rounded-lg text-white shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 dark:focus:ring-offset-gray-800 ${
                processingFile 
                  ? 'bg-gray-400 cursor-not-allowed'
                  : isDragOver
                  ? 'bg-pink-700 scale-105'
                  : 'bg-pink-600 hover:bg-pink-700'
              }`}
              disabled={processingFile}
            >
              {processingFile ? (
                <LoadingSpinner size="sm" color="gray" className="-ml-1 mr-3" />
              ) : (
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
              )}
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
          <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 opacity-75">
            CSV files only • Max 50MB
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
