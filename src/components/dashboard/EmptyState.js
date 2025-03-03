import React, { useRef } from 'react';
import { useData } from '../../context/DataContext';

/**
 * EmptyState component displayed when no data is loaded
 */
const EmptyState = () => {
  const fileInputRef = useRef(null);
  const { handleFileUpload, loading } = useData();

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-12">
      <div className="text-center">
        <svg 
          className="mx-auto h-16 w-16 text-gray-400" 
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
        <h3 className="mt-4 text-lg font-medium text-gray-900">No data loaded</h3>
        <p className="mt-2 text-sm text-gray-500">
          Get started by uploading a CSV file with your sales or offer data.
        </p>
        <div className="mt-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            disabled={loading}
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
            {loading ? 'Loading...' : 'Upload CSV'}
          </button>
          <input 
            type="file" 
            className="hidden" 
            accept=".csv" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
        <p className="mt-4 text-xs text-gray-500">
          For sales analysis, upload a file with transaction data.<br />
          For offer insights, upload a file with offer engagement data.
        </p>
      </div>
    </div>
  );
};

export default EmptyState;