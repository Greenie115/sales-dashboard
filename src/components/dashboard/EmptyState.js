// src/components/dashboard/EmptyState.js
import React from 'react';

const EmptyState = ({ onFileUpload }) => {
  return (
    <div className="bg-white shadow rounded-lg p-12">
      <div className="text-center">
        <div className="mt-8 max-w-md mx-auto">
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-pink-600 hover:text-pink-500 focus-within:outline-none">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={onFileUpload}
                    className="sr-only"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">
                CSV files only
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500 text-center">
            Please upload an "items_purchased.CSV" for Sales Analysis 
            <br />
            or for Offer Insights, upload a "hits_offer.CSV"
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;