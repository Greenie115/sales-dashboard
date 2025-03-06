// src/components/dashboard/EmptyState.js
import React, { useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import Papa from 'papaparse';

const EmptyState = () => {
  const fileInputRef = useRef(null);
  const { setLoading, setSalesData, setOfferData, setHasOfferData, setError } = useData();
  const [processingFile, setProcessingFile] = useState(false);

  // Implement our own file handling logic since handleFileUpload is not working
  const processFile = (file) => {
    if (!file) {
      setError('No file selected');
      return;
    }
    
    console.log("Processing file:", file.name);
    setLoading(true);
    setProcessingFile(true);
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
            
            if (results.data && results.data.length > 0) {
              if (isOfferData) {
                // Process offer data
                const validOfferData = results.data.filter(row => 
                  row && row.hit_id !== undefined
                );
                
                if (validOfferData.length === 0) {
                  setError('No valid offer data found. Please ensure your CSV has the correct format.');
                } else {
                  setOfferData(validOfferData);
                  setHasOfferData(true);
                }
              } else {
                // Process sales data
                const validData = results.data.filter(row => 
                  row && 
                  row.receipt_date && 
                  row.product_name &&
                  row.chain
                );
                
                if (validData.length === 0) {
                  setError('No valid sales data found. Please ensure your CSV has the correct format.');
                } else {
                  // Process dates and add month field
                  const processedData = validData.map(item => {
                    try {
                      const date = new Date(item.receipt_date);
                      return {
                        ...item,
                        receipt_date: date.toISOString().split('T')[0],
                        month: date.toISOString().slice(0, 7), // YYYY-MM format
                        day_of_week: date.getDay(), // 0 = Sunday, 6 = Saturday
                        hour_of_day: date.getHours() // 0-23
                      };
                    } catch (e) {
                      return item;
                    }
                  });
                  
                  setSalesData(processedData);
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
            {processingFile ? 'Loading...' : 'Upload CSV'}
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
          For offer insights, upload a file with offer engagement data.
        </p>
      </div>
    </div>
  );
};

export default EmptyState;