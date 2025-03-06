// src/components/dashboard/Header.js
import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import ThemeToggle from '../ThemeToggle';
import ShareButton from '../sharing/ShareButton';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRef = useRef(null);
  
  // Get data context
  const { 
    handleFileUpload,
    salesData,
    offerData,
    hasData,
    loading,
    error
  } = useData();
  
  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
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
                src={require('../../assets/unnamed-ezgif.com-webp-to-jpg-converter.jpg')} 
                className="w-12 h-12 rounded-lg"
                alt="Logo"
              />
              <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">Insights Dashboard</span>
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
            
            {/* Upload button */}
            <div className="mr-2">
              <label 
                className="cursor-pointer bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-800/40 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {loading ? 'Loading...' : 'Upload CSV'}
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