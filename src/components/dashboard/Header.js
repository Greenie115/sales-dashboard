import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';

/**
 * Header component - simplified without navigation tabs
 */
const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRef = useRef(null);
  
  // Get data context
  const { 
    handleFileUpload,
    salesData,
    offerData,
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
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="h-8 w-8 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold">S</div>
              <span className="ml-2 text-xl font-semibold text-gray-900">Sales Dashboard</span>
            </div>
          </div>
          
          {/* Actions and user menu */}
          <div className="flex items-center">
            {/* Show data status */}
            {salesData && salesData.length > 0 ? (
              <span className="mr-4 text-sm text-green-600 font-medium hidden md:block">
                {salesData.length} records loaded
              </span>
            ) : offerData && offerData.length > 0 ? (
              <span className="mr-4 text-sm text-green-600 font-medium hidden md:block">
                {offerData.length} offer records loaded
              </span>
            ) : (
              <span className="mr-4 text-sm text-gray-500 font-medium hidden md:block">
                No data loaded
              </span>
            )}
            
            {/* Upload button */}
            <div className="mr-2">
              <label 
                className="cursor-pointer bg-pink-50 text-pink-700 hover:bg-pink-100 px-3 py-2 rounded-md text-sm font-medium flex items-center"
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