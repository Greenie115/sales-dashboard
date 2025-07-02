// src/components/dashboard/Header.js
import React, { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import ThemeToggle from '../ThemeToggle';
import ShareButton from '../sharing/ShareButton';
import Papa from 'papaparse';
import logo from '../../assets/unnamed-ezgif.com-webp-to-jpg-converter.jpg'
import { useClientData } from '../../context/ClientDataContext';
import { validateCSVWithCorrections } from '../../utils/enhancedCsvValidation';
import DataCorrectionModal from '../validation/DataCorrectionModal';

const Header = () => {
  const { clientName } = useClientData();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [processingFile, setProcessingFile] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [originalCsvData, setOriginalCsvData] = useState(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  
  // Get data context
  const { 
    salesData,
    offerData,
    hasData,
    dataLoading, // Correct state name
    dataError,   // Correct state name
    setDataLoading, // Correct setter name
    setSalesData,
    setOfferData,
    setHasOfferData,
    setDataError, // Correct setter name
    setBrandMapping,
    setBrandNames,
    setActiveTab
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
    setValidationResult(null);
    setOriginalCsvData(null);
    
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
              // Store original data for correction workflow
              setOriginalCsvData(results.data);
              
              // Run enhanced validation
              const validation = validateCSVWithCorrections(results.data, dataType);
              setValidationResult(validation);
              
              // If validation passes or has correctable issues, proceed
              if (validation.isValid || validation.stats.correctableIssues > 0) {
                if (validation.isValid) {
                  // Data is valid, process directly
                  processValidatedData(results.data, dataType);
                } else {
                  // Show correction modal for fixable issues
                  setShowCorrectionModal(true);
                }
              } else {
                // Critical errors that can't be fixed
                const criticalErrors = validation.errors.filter(e => !e.correction);
                setDataError(`Critical data issues found: ${criticalErrors.map(e => e.message).join('; ')}`);
              }
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

  // Process validated/corrected data
  const processValidatedData = (data, dataType) => {
    if (dataType === 'offers') {
      // Process offer data
      const processedOfferData = data.map(row => {
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
      // Process sales data with enhanced date processing
      const processedData = data.map(row => {
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

  // Handle correction modal responses
  const handleAcceptCorrectedData = (correctedData, appliedCorrections) => {
    const dataType = originalCsvData && originalCsvData.some(row => row.hit_id) ? 'offers' : 'sales';
    processValidatedData(correctedData, dataType);
    setShowCorrectionModal(false);
    setValidationResult(null);
    setOriginalCsvData(null);
  };

  const handleRejectCorrections = () => {
    // Process original data despite validation issues
    const dataType = originalCsvData && originalCsvData.some(row => row.hit_id) ? 'offers' : 'sales';
    processValidatedData(originalCsvData, dataType);
    setShowCorrectionModal(false);
    setValidationResult(null);
    setOriginalCsvData(null);
  };

  const handleCloseCorrectionModal = () => {
    setShowCorrectionModal(false);
    setValidationResult(null);
    setOriginalCsvData(null);
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
              </span>
            ) : offerData && offerData.length > 0 ? (
              <span className="mr-4 text-sm text-green-600 dark:text-green-400 font-medium hidden md:block">
                {offerData.length} offer records loaded
              </span>
            ) : (
              <span className="mr-4 text-sm text-gray-500 dark:text-gray-400 font-medium hidden md:block">
                No data loaded
              </span>
            )}
            
            {/* Share button - only show when data is loaded */}
            {hasData && (
              <div className="mr-2">
                <ShareButton />
              </div>
            )}
            
            {/* Admin link */}
            <div className="mr-2">
              <Link 
                to={location.pathname === '/admin' ? '/' : '/admin'}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors ${
                  location.pathname === '/admin' 
                    ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {location.pathname === '/admin' ? 'Dashboard' : 'Admin'}
              </Link>
            </div>
            
            {/* Upload button */}
            <div className="mr-2">
              <label 
                className="cursor-pointer bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-800/40 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {processingFile || dataLoading ? 'Loading...' : 'Upload CSV'}
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
      
      {/* Data Correction Modal */}
      {showCorrectionModal && validationResult && originalCsvData && (
        <DataCorrectionModal
          isOpen={showCorrectionModal}
          onClose={handleCloseCorrectionModal}
          validationResult={validationResult}
          originalData={originalCsvData}
          onAcceptCorrectedData={handleAcceptCorrectedData}
          onRejectCorrections={handleRejectCorrections}
        />
      )}
    </header>
  );
};

export default Header;
