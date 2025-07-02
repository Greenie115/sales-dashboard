// src/components/dashboard/Header.js
import React, { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import ThemeToggle from '../ThemeToggle';
import ShareButton from '../sharing/ShareButton';
import Papa from 'papaparse';
import logo from '../../assets/unnamed-ezgif.com-webp-to-jpg-converter.jpg'
import { useClientData } from '../../context/ClientDataContext';

const Header = () => {
  const { clientName } = useClientData();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [processingFile, setProcessingFile] = useState(false);
  
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
  
  // Define our own file processing logic since handleFileUpload is not working
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
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        Papa.parse(e.target.result, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            
            if (results.data && results.data.length > 0) {
              if (isOfferData) {
                // Process offer data
                const validOfferData = results.data.filter(row => 
                  row && row.hit_id !== undefined
                );
                
                if (validOfferData.length === 0) {
                  setDataError('No valid offer data found. Please ensure your CSV has the correct format.');
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
                  
                  setOfferData(processedOfferData);
                  setHasOfferData(true);
                  
                  // Set active tab to offers
                  setActiveTab('offers');
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
                  setDataError('No valid sales data found. Please ensure your CSV has the correct format.');
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
                  })
                  setSalesData(processedData);
                  
                  // Set active tab to summary
                  setActiveTab('summary');
                }
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
    </header>
  );
};

export default Header;
