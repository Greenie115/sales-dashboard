// src/components/sharing/SharedDashboardLoader.js
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import dataService from '../../services/dataService';

/**
 * A component that handles loading and processing of shared dashboard data
 * Can be used as a wrapper for the actual dashboard content
 */
const SharedDashboardLoader = ({ 
  shareId, 
  storageId, 
  initialFilters, 
  metadata,
  children,
  onDataLoaded,
  onError
}) => {
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ stage: 'initializing', percent: 0 });
  const [data, setData] = useState(null);

  // Load dashboard data from storage
  useEffect(() => {
    const loadData = async () => {
      if (!shareId) {
        setError('No share ID provided');
        setLoading(false);
        if (onError) onError('No share ID provided');
        return;
      }

      try {
        setProgress({ stage: 'loading_config', percent: 10 });
        
        // If we don't have storageId or metadata yet, fetch them
        let dataStorageId = storageId;
        let dataMetadata = metadata;
        
        if (!dataStorageId || !dataMetadata) {
          const shareData = await dataService.getShareConfig(shareId);
          dataStorageId = shareData.storageId;
          dataMetadata = shareData.metadata;
          
          if (shareData.expired) {
            setError('This shared dashboard has expired');
            setLoading(false);
            if (onError) onError('This shared dashboard has expired');
            return;
          }
        }
        
        setProgress({ stage: 'downloading_data', percent: 30 });
        
        // Check if storageId is a local ID
        if (!dataStorageId || dataStorageId.startsWith('local_')) {
          setProgress({ stage: 'local_mode', percent: 70 });
          
          // In local mode, use precomputed data directly from metadata
          if (dataMetadata && dataMetadata.precomputedData) {
            setData({
              isLocalMode: true,
              ...dataMetadata.precomputedData
            });
            
            setProgress({ stage: 'complete', percent: 100 });
            setLoading(false);
            
            if (onDataLoaded) {
              onDataLoaded({
                isLocalMode: true,
                ...dataMetadata.precomputedData
              });
            }
            return;
          } else {
            setError('No precomputed data available for local mode');
            setLoading(false);
            if (onError) onError('No precomputed data available for local mode');
            return;
          }
        }
        
        // We have a storage ID, download the data
        const rawData = await dataService.downloadData(dataStorageId);
        
        setProgress({ stage: 'processing_data', percent: 70 });
        
        // Apply any initial filters
        let filteredData = rawData;
        if (initialFilters && Object.keys(initialFilters).length > 0) {
          filteredData = dataService.filterSalesData(rawData, initialFilters);
        }
        
        // Prepare the complete data object
        const processedData = {
          salesData: rawData,
          filteredData,
          brandNames: dataMetadata?.brandNames || [],
          clientName: dataMetadata?.clientName || 'Client',
          allowClientFiltering: dataMetadata?.allowClientFiltering || false,
          hiddenCharts: dataMetadata?.hiddenCharts || [],
          brandMapping: dataMetadata?.brandMapping || {},
          initialFilters: initialFilters || {},
          isLocalMode: false
        };
        
        setData(processedData);
        setProgress({ stage: 'complete', percent: 100 });
        setLoading(false);
        
        if (onDataLoaded) {
          onDataLoaded(processedData);
        }
      } catch (err) {
        console.error('Error loading shared dashboard data:', err);
        
        let errorMessage = 'Failed to load dashboard data';
        
        if (err.message.includes('LOCAL_MODE')) {
          errorMessage = 'This dashboard was shared in local mode but cannot be loaded';
        } else if (err.message.includes('not found') || err.message.includes('404')) {
          errorMessage = 'The shared dashboard could not be found';
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again';
        }
        
        setError(errorMessage);
        setLoading(false);
        
        if (onError) {
          onError(errorMessage);
        }
      }
    };

    if (shareId) {
      loadData();
    }
  }, [shareId, storageId, initialFilters, metadata, onDataLoaded, onError]);

  // Show loading state
  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[400px] p-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-sm border border-gray-200 dark:border-gray-700`}>
        <div className="mb-4">
          <div className="animate-spin w-12 h-12 border-4 border-t-pink-500 border-r-transparent border-b-pink-500 border-l-transparent rounded-full"></div>
        </div>
        <h3 className="text-lg font-medium mb-2">Loading Dashboard</h3>
        <div className="w-full max-w-md mb-4">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-pink-500 dark:bg-pink-600 rounded-full transition-all duration-300" 
              style={{ width: `${progress.percent}%` }}
            ></div>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {progress.stage === 'initializing' && 'Initializing...'}
          {progress.stage === 'loading_config' && 'Loading dashboard configuration...'}
          {progress.stage === 'downloading_data' && 'Downloading dashboard data...'}
          {progress.stage === 'processing_data' && 'Processing dashboard data...'}
          {progress.stage === 'local_mode' && 'Loading data in local mode...'}
          {progress.stage === 'complete' && 'Rendering dashboard...'}
        </p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[400px] p-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-sm border border-gray-200 dark:border-gray-700`}>
        <div className="mb-4 text-red-500 dark:text-red-400">
          <svg className="w-12 h-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">Error Loading Dashboard</h3>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <button
          className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  // If we have data and children, render the children with data
  return children && data ? React.cloneElement(children, { data }) : null;
};

export default SharedDashboardLoader;