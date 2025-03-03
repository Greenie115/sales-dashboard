// src/components/dashboard/Header.js
import React, { useState, useEffect } from 'react';
import ExportButton from './export/ExportButton';

const Header = ({ 
  activeTab, 
  setActiveTab, 
  hasData, 
  hasOfferData, 
  handleFileUpload, 
  toggleDrawer,
  isDrawerOpen,
  clientName,
  setClientName,
  brandNames
}) => {
  // State for mobile navigation
  const [showMobileNav, setShowMobileNav] = useState(false);
  
  // Close mobile nav when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMobileNav && !event.target.closest('.mobile-nav')) {
        setShowMobileNav(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileNav]);
  
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {/* Shopmium Logo */}
              <div className="bg-pink-600 text-white font-bold px-3 py-1 rounded-md">
                Shopmium Analytics
              </div>
            </div>
            <div className="hidden md:block ml-10">
              <div className="flex space-x-4">
                {/* Desktop Navigation */}
                <button 
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'summary' 
                      ? 'bg-pink-100 text-pink-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Summary
                </button>
                <button 
                  onClick={() => setActiveTab('sales')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'sales' 
                      ? 'bg-pink-100 text-pink-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Sales Analysis
                </button>
                <button 
                  onClick={() => setActiveTab('demographics')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'demographics' 
                      ? 'bg-pink-100 text-pink-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  disabled={!hasData}
                >
                  Demographics
                </button>
                <button 
                  onClick={() => setActiveTab('offers')}
                  disabled={!hasOfferData}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'offers' 
                      ? 'bg-pink-100 text-pink-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  } ${!hasOfferData ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Offer Insights
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Action buttons */}
            {hasData && <ExportButton activeTab={activeTab} />}
            
            {/* Upload */}
            <label
              className="bg-white border border-gray-300 px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            
            {/* Mobile menu button */}
            <button 
              onClick={toggleDrawer}
              className="md:hidden bg-gray-100 p-2 rounded-md text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation Drawer */}
      <div className={`md:hidden fixed inset-0 bg-gray-600 bg-opacity-75 z-20 transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}></div>
      
      <div className={`md:hidden fixed inset-y-0 right-0 flex flex-col max-w-xs w-full bg-white z-30 transform transition duration-300 ease-in-out mobile-nav ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Menu</h2>
          <button
            onClick={toggleDrawer}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pt-5 pb-4">
          <nav className="flex-1 px-4 space-y-2">
            <button
              onClick={() => {
                setActiveTab('summary');
                toggleDrawer();
              }}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'summary' 
                  ? 'bg-pink-100 text-pink-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Summary
            </button>
            
            <button
              onClick={() => {
                setActiveTab('sales');
                toggleDrawer();
              }}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'sales' 
                  ? 'bg-pink-100 text-pink-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Sales Analysis
            </button>
            
            <button
              onClick={() => {
                setActiveTab('demographics');
                toggleDrawer();
              }}
              disabled={!hasData}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'demographics' 
                  ? 'bg-pink-100 text-pink-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              } ${!hasData ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Demographics
            </button>
            
            <button
              onClick={() => {
                setActiveTab('offers');
                toggleDrawer();
              }}
              disabled={!hasOfferData}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'offers' 
                  ? 'bg-pink-100 text-pink-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              } ${!hasOfferData ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Offer Insights
            </button>
            
            <div className="pt-4 border-t border-gray-200 mt-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Client Info
              </h3>
              <div className="mt-2">
                <input 
                  type="text"
                  placeholder={brandNames.length > 0 ? "Override brand name" : "Client name (for exports)"}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                />
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;