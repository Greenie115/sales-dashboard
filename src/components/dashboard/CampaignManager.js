// src/components/dashboard/CampaignManager.js
import React, { useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import Papa from 'papaparse';
import { batchProcessDates } from '../../utils/dateUtils';
import { autoTransformData } from '../../utils/dataTransformation';
import { identifyBrandPrefixes, extractBrandNames } from '../../utils/brandDetection';

const CampaignManager = () => {
  const fileInputRef = useRef(null);
  const {
    campaigns,
    comparisonSettings,
    setCampaignData,
    clearCampaign,
    clearData,
    setComparisonSettings,
    canCompare,
    canCompareYearly,
    getYearLabels,
    hasCampaignData,
    setActiveTab
  } = useData();
  
  const [processingFile, setProcessingFile] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState('A');
  const [campaignName, setCampaignName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [processingStage, setProcessingStage] = useState('');

  // Enhanced brand detection using sophisticated algorithm
  const detectBrands = (productNames) => {
    if (!productNames || productNames.length === 0) return {};
    
    try {
      return identifyBrandPrefixes(productNames);
    } catch (error) {
      console.error('Error in sophisticated brand detection, using fallback:', error);
      
      // Fallback to simple detection
      const brandMap = {};
      const brandCounts = {};
      
      productNames.forEach(productName => {
        if (!productName) return;
        
        const words = productName.toLowerCase().trim().split(/\s+/);
        const potentialBrand = words[0];
        
        if (potentialBrand && potentialBrand.length > 1) {
          brandCounts[potentialBrand] = (brandCounts[potentialBrand] || 0) + 1;
        }
      });
      
      Object.entries(brandCounts).forEach(([brand, count]) => {
        if (count >= 2) {
          const displayBrand = brand.charAt(0).toUpperCase() + brand.slice(1);
          productNames.forEach(product => {
            if (product.toLowerCase().startsWith(brand)) {
              brandMap[product] = {
                original: product,
                brandName: displayBrand,
                displayName: product.replace(new RegExp(`^${brand}\\s*`, 'i'), '').trim() || product
              };
            }
          });
        }
      });
      
      return brandMap;
    }
  };

  // Process validated data for campaign with progressive loading
  const processValidatedData = async (data, campaignId, metadata) => {
    try {
      setProcessingStage('Cleaning data...');
      
      // Remove completely empty rows
      const cleanedData = data.filter(row => {
        if (!row || typeof row !== 'object') return false;
        return Object.values(row).some(value => 
          value !== null && value !== undefined && value !== '' && String(value).trim() !== ''
        );
      });
      
      if (cleanedData.length === 0) {
        setUploadError('No valid data rows found in file. Please check your CSV format.');
        setProcessingStage('');
        return;
      }

      setProcessingStage('Mapping columns...');
      
      // Auto-transform data with column mapping
      const { transformedData, report, detectedType } = autoTransformData(cleanedData);
      
      if (report.issues.length > 0) {
        console.warn('Data transformation issues:', report.issues);
        // Show warnings but don't fail completely
        const warningMsg = `Warning: ${report.issues.length} data transformation issues detected. Some data may not display correctly.`;
        setUploadError(warningMsg);
      }

      setProcessingStage('Processing dates...');
      
      // Process dates with robust date parsing
      const dateField = 'receipt_date';
      const { processedData, invalidCount, detectedFormat } = batchProcessDates(transformedData, dateField);
      
      if (invalidCount > 0) {
        console.warn(`${invalidCount} rows had invalid dates and were kept with original values`);
        const dateWarning = `${invalidCount} rows have invalid dates. Detected format: ${detectedFormat}. Supported: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, ISO.`;
        setUploadError(prev => prev ? `${prev} ${dateWarning}` : dateWarning);
      }

      setProcessingStage('Detecting brands...');
      
      // Enhanced brand detection
      const productNames = processedData.map(row => row.product_name).filter(Boolean);
      const detectedBrands = detectBrands(productNames);
      const brandNames = extractBrandNames(detectedBrands);
    
      setProcessingStage('Finalizing...');
      
      // Enhanced metadata with transformation report
      const enhancedMetadata = {
        ...metadata,
        brandMapping: detectedBrands,
        brandNames: brandNames,
        recordCount: processedData.length,
        detectedType: detectedType,
        transformationReport: report,
        dateRange: {
          start: processedData.length > 0 ? processedData
            .map(row => row.receipt_date)
            .filter(Boolean)
            .sort()[0] : null,
          end: processedData.length > 0 ? processedData
            .map(row => row.receipt_date)
            .filter(Boolean)
            .sort()
            .slice(-1)[0] : null
        }
      };
    
      // Set campaign data
      setCampaignData(campaignId, processedData, enhancedMetadata);
      
      // If this is the first campaign or primary campaign, switch to summary
      if (campaignId === 'A' || !hasCampaignData('A')) {
        setActiveTab('summary');
      }
      
      setProcessingStage('');
      
    } catch (error) {
      console.error("Critical error in campaign data processing:", error);
      setUploadError('Critical error processing your data: ' + error.message + '. Please check your file format.');
      setProcessingStage('');
    }
  };

  // Handle file processing
  const processFile = (file) => {
    if (!file) {
      setUploadError('No file selected');
      return;
    }
    
    // Check file size (warn if > 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File is too large (>50MB). Please use a smaller file or contact support for large dataset handling.');
      return;
    }
    
    setProcessingFile(true);
    setUploadError('');
    
    const metadata = {
      name: campaignName || `Campaign ${selectedCampaign}`,
      fileName: file.name,
      uploadDate: new Date().toISOString(),
      fileSize: file.size
    };
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        Papa.parse(e.target.result, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: async (results) => {
            try {
              if (results.errors && results.errors.length > 0) {
                console.warn('CSV parsing warnings:', results.errors);
              }
              
              if (results.data && results.data.length > 0) {
                await processValidatedData(results.data, selectedCampaign, metadata);
                setCampaignName(''); // Clear the name input
              } else {
                setUploadError('No valid data found in file. Please check that your CSV has headers and data rows.');
              }
              
              setProcessingFile(false);
            } catch (error) {
              console.error("Error processing parsed data:", error);
              setUploadError('Error processing data: ' + error.message);
              setProcessingFile(false);
            }
          },
          error: (error) => {
            console.error("CSV parsing error:", error);
            setUploadError('Error parsing file: ' + error.message + '. Please check that your file is a valid CSV.');
            setProcessingFile(false);
          }
        });
      } catch (e) {
        console.error("Error in file upload handler:", e);
        setUploadError('Error processing file: ' + e.message);
        setProcessingFile(false);
      }
    };
    
    reader.onerror = () => {
      setUploadError('Error reading file. Please try again or use a different file.');
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

  // Mode switching functions
  const switchToSingleMode = () => {
    setComparisonSettings({
      ...comparisonSettings,
      mode: 'single',
      activeDatasets: ['A']
    });
  };
  
  const switchToCampaignMode = () => {
    setComparisonSettings({
      ...comparisonSettings,
      mode: 'campaigns',
      activeDatasets: ['A', 'B']
    });
  };
  
  const switchToYearlyMode = () => {
    setComparisonSettings({
      ...comparisonSettings,
      mode: 'yearly',
      activeDatasets: ['A', 'B']
    });
  };
  
  // Clear all data with confirmation
  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all campaign data? This action cannot be undone.')) {
      clearData();
      setCampaignName('');
      setUploadError('');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Campaign Manager</h2>
          <div className="flex items-center space-x-3">
            {/* Mode Switching */}
            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={switchToSingleMode}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  comparisonSettings.mode === 'single'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Single campaign analysis"
              >
                Single
              </button>
              <button
                onClick={switchToCampaignMode}
                disabled={!canCompare}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  comparisonSettings.mode === 'campaigns'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : canCompare
                      ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                title={canCompare ? 'Compare two campaigns' : 'Upload both campaigns to enable'}
              >
                Compare
              </button>
              <button
                onClick={switchToYearlyMode}
                disabled={!canCompareYearly}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  comparisonSettings.mode === 'yearly'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : canCompareYearly
                      ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                title={canCompareYearly ? 'Compare campaigns from different years' : canCompare ? 'Campaigns must be from different years' : 'Upload both campaigns first'}
              >
Years
              </button>
            </div>
            
            {/* Clear All Data Button */}
            {(hasCampaignData('A') || hasCampaignData('B')) && (
              <button
                onClick={handleClearAllData}
                className="px-3 py-1 rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors"
                title="Clear all campaign data"
              >
                <svg className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear All
              </button>
            )}
          </div>
        </div>
        
        {/* Mode Description */}
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          {comparisonSettings.mode === 'single' && (
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <strong>Single Mode:</strong> Analyzing primary dataset (Campaign A)
            </div>
          )}
          {comparisonSettings.mode === 'campaigns' && (
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <strong>Campaign Comparison:</strong> Comparing Campaign A vs Campaign B
            </div>
          )}
          {comparisonSettings.mode === 'yearly' && (
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-1 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 012 0v4h3a1 1 0 011 1v3h4a1 1 0 011 1v6a1 1 0 01-1 1H8a1 1 0 01-1-1V8a1 1 0 011-1z" />
              </svg>
              <strong>Yearly Comparison:</strong> Comparing {getYearLabels().A} vs {getYearLabels().B}
              {canCompareYearly && (
                <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                  ✓ Ready to compare
                </span>
              )}
              {canCompare && !canCompareYearly && (
                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠ Campaigns from same year
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Campaign Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {['A', 'B'].map(campaignId => (
            <div
              key={campaignId}
              className={`border rounded-lg p-4 ${
                hasCampaignData(campaignId)
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Campaign {campaignId}
                </h3>
                {hasCampaignData(campaignId) && (
                  <button
                    onClick={() => clearCampaign(campaignId)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    title={`Clear Campaign ${campaignId}`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {hasCampaignData(campaignId) ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-green-700 dark:text-green-400">
                      {campaigns[campaignId].metadata?.name || `Campaign ${campaignId}`}
                    </p>
                    {campaigns[campaignId].metadata?.year && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        {campaigns[campaignId].metadata.year}
                      </span>
                    )}
                  </div>
                  <p>{campaigns[campaignId].data.length.toLocaleString()} records</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {campaigns[campaignId].metadata?.fileName}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No data uploaded
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Upload Form */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Upload New Campaign</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Campaign Slot
              </label>
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="A">Campaign A</option>
                <option value="B">Campaign B</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Campaign Name (Optional)
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder={`Campaign ${selectedCampaign}`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-center">
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
{processingFile ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {processingStage || 'Processing...'}
                </div>
              ) : `Upload to ${selectedCampaign}`}
            </button>
            <input 
              type="file" 
              className="hidden" 
              accept=".csv" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>

          {uploadError && (
            <div className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
              {uploadError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignManager;