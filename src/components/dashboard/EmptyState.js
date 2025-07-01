// src/components/dashboard/EmptyState.js
import React, { useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import Papa from 'papaparse';
import { validateCSV, cleanCSVData, detectDataType } from '../../utils/csvValidation';
import { autoTransformData } from '../../utils/dataTransformation';
import ValidationReport from '../validation/ValidationReport';

const EmptyState = () => {
  const fileInputRef = useRef(null);
  // Corrected destructuring using setDataLoading and setDataError
  const { setDataLoading, setSalesData, setOfferData, setHasOfferData, setDataError } = useData();
  const [processingFile, setProcessingFile] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [fileName, setFileName] = useState('');

  // Parse and validate CSV file
  const processFile = (file) => {
    if (!file) {
      setDataError('No file selected');
      return;
    }
    
    setProcessingFile(true);
    setDataError('');
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        Papa.parse(e.target.result, {
          header: true,
          dynamicTyping: false, // Keep as strings for validation
          skipEmptyLines: false, // Let validation handle empty lines
          complete: (results) => {
            if (results.errors && results.errors.length > 0) {
              console.warn('CSV parsing warnings:', results.errors);
            }
            
            if (results.data && results.data.length > 0) {
              // Detect data type and validate
              const dataType = detectDataType(Object.keys(results.data[0]));
              const validation = validateCSV(results.data, dataType);
              
              // Store parsed data and validation results
              setParsedData({
                data: results.data,
                dataType: dataType,
                fileName: file.name
              });
              setValidationResult(validation);
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

  // Handle validation acceptance
  const handleValidationAccept = () => {
    if (!parsedData || !validationResult) return;
    
    setDataLoading(true);
    setProcessingFile(true);
    
    try {
      // Clean the data based on validation results
      const cleanedData = cleanCSVData(parsedData.data, validationResult);
      
      // Apply data transformation pipeline
      const transformationResult = autoTransformData(cleanedData, parsedData.dataType);
      const { transformedData, report, detectedType } = transformationResult;
      
      // Log transformation report for debugging
      if (report.stats.transformedValues > 0) {
        console.log('Data transformation applied:', report);
      }
      
      // Determine if this is offer data
      const isOfferData = detectedType === 'offers' || 
                         parsedData.dataType === 'offers' || 
                         parsedData.fileName.toLowerCase().includes('hits_offer') ||
                         parsedData.fileName.toLowerCase().includes('offer');
      
      if (isOfferData) {
        setOfferData(transformedData);
        setHasOfferData(true);
      } else {
        // Process dates and add derived fields for sales data
        const processedData = transformedData.map(item => {
          try {
            const date = new Date(item.receipt_date);
            if (!isNaN(date.getTime())) {
              return {
                ...item,
                receipt_date: date.toISOString().split('T')[0],
                month: date.toISOString().slice(0, 7),
                day_of_week: date.getDay(),
                hour_of_day: date.getHours()
              };
            }
            return item;
          } catch (e) {
            return item;
          }
        });
        
        setSalesData(processedData);
      }
      
      // Reset validation state
      setValidationResult(null);
      setParsedData(null);
      setFileName('');
      
    } catch (error) {
      console.error('Error processing validated data:', error);
      setDataError('Error processing data: ' + error.message);
    } finally {
      setDataLoading(false);
      setProcessingFile(false);
    }
  };

  // Handle validation rejection
  const handleValidationReject = () => {
    setValidationResult(null);
    setParsedData(null);
    setFileName('');
    setDataError('');
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  // Show validation report if we have validation results
  if (validationResult) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Validating: {fileName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please review the validation results below before proceeding.
          </p>
        </div>
        <ValidationReport
          validationResult={validationResult}
          onAccept={handleValidationAccept}
          onReject={handleValidationReject}
          isProcessing={processingFile}
        />
      </div>
    );
  }

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
          <span className="font-medium">Files will be validated before import.</span>
        </p>
      </div>
    </div>
  );
};

export default EmptyState;
