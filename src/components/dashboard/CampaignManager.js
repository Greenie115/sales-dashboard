// src/components/dashboard/CampaignManager.js
import React, { useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import Papa from 'papaparse';
import { batchProcessDates } from '../../utils/dateUtils';
import { autoTransformData } from '../../utils/dataTransformation';
import InlineEdit from '../common/InlineEdit';
import { InfoTooltip, HelpTooltip } from '../common/Tooltip';
import LoadingSpinner from '../common/LoadingSpinner';

const CampaignManager = () => {
  const fileInputRef = useRef(null);
  const {
    campaigns,
    comparisonSettings,
    setCampaignData,
    clearCampaign,
    clearData,
    updateCampaignMetadata,
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
      
      // Handle different types of issues
      let errorMessages = [];
      
      if (report.issues.length > 0) {
        console.error('Data transformation errors:', report.issues);
        errorMessages.push(`${report.issues.length} critical transformation errors detected.`);
      }
      
      if (report.warnings && report.warnings.length > 0) {
        console.warn('Data transformation warnings:', report.warnings);
        // Only show warnings if there are many of them
        if (report.warnings.length > 100) {
          errorMessages.push(`${report.warnings.length} minor formatting issues detected.`);
        }
      }
      
      if (errorMessages.length > 0) {
        setUploadError(`Warning: ${errorMessages.join(' ')}`);
      }

      setProcessingStage('Processing dates...');
      
      // Process dates with robust date parsing
      const dateField = 'receipt_date';
      const { processedData, invalidCount, detectedFormat } = batchProcessDates(transformedData, dateField);
      
      if (invalidCount > 0) {
        console.warn(`${invalidCount} rows had invalid dates and were kept with original values`);
        
        // Only show date warnings for significant issues
        const dateErrorThreshold = Math.max(10, processedData.length * 0.05); // 5% or minimum 10 rows
        if (invalidCount > dateErrorThreshold) {
          const dateWarning = `${invalidCount} rows have invalid dates. Detected format: ${detectedFormat}. Data may still be usable.`;
          setUploadError(prev => prev ? `${prev} ${dateWarning}` : dateWarning);
        } else {
          console.info(`${invalidCount} date parsing issues resolved automatically`);
        }
      }

      
    
      setProcessingStage('Finalizing...');
      
      // Enhanced metadata with transformation report
      const enhancedMetadata = {
        ...metadata,
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
  
  // Handle campaign name updates
  const handleCampaignNameUpdate = (campaignId, newName) => {
    updateCampaignMetadata(campaignId, { name: newName });
  };

  // Handle campaign description updates  
  const handleCampaignDescriptionUpdate = (campaignId, newDescription) => {
    updateCampaignMetadata(campaignId, { description: newDescription });
  };

  // Swap campaigns A and B
  const handleSwapCampaigns = () => {
    if (!hasCampaignData('A') || !hasCampaignData('B')) return;
    
    const campaignA = campaigns.A;
    const campaignB = campaigns.B;
    
    setCampaignData('A', campaignB.data, { ...campaignB.metadata, name: campaignB.metadata?.name?.replace('Campaign B', 'Campaign A') || 'Campaign A' });
    setCampaignData('B', campaignA.data, { ...campaignA.metadata, name: campaignA.metadata?.name?.replace('Campaign A', 'Campaign B') || 'Campaign B' });
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
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center mb-1">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Campaign Manager</h2>
              <InfoTooltip 
                content="Manage your data campaigns, switch between analysis modes, and compare multiple datasets to gain deeper insights." 
                className="ml-2"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Mode Switching with Better Design */}
            <div className="grid grid-cols-3 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-1">
              <HelpTooltip content="Analyze a single dataset with comprehensive metrics and insights">
                <button
                  onClick={switchToSingleMode}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    comparisonSettings.mode === 'single'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-600/50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Single</span>
                </button>
              </HelpTooltip>
              <button
                onClick={switchToCampaignMode}
                disabled={!canCompare}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  comparisonSettings.mode === 'campaigns'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : canCompare
                      ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-600/50'
                      : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                title={canCompare ? 'Compare two campaigns side by side' : 'Upload both campaigns to enable comparison'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Compare</span>
              </button>
              <button
                onClick={switchToYearlyMode}
                disabled={!canCompareYearly}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  comparisonSettings.mode === 'yearly'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : canCompareYearly
                      ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-600/50'
                      : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                title={canCompareYearly ? 'Compare campaigns from different years' : canCompare ? 'Campaigns must be from different years' : 'Upload campaigns from different years'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 012 0v4h3a1 1 0 011 1v3h4a1 1 0 011 1v6a1 1 0 01-1 1H8a1 1 0 01-1-1V8a1 1 0 011-1z" />
                </svg>
                <span>Years</span>
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              {/* Swap Campaigns Button */}
              {hasCampaignData('A') && hasCampaignData('B') && (
                <button
                  onClick={handleSwapCampaigns}
                  className="px-3 py-1 rounded-md text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800 transition-colors flex items-center space-x-1"
                  title="Swap Campaign A and Campaign B"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span>Swap A↔B</span>
                </button>
              )}
              
              {/* Clear All Data Button */}
              {(hasCampaignData('A') || hasCampaignData('B')) && (
                <button
                  onClick={handleClearAllData}
                  className="px-3 py-1 rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors flex items-center space-x-1"
                  title="Clear all campaign data"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
      </div>

      <div className="p-6">
        {/* Enhanced Campaign Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {['A', 'B'].map(campaignId => (
            <div
              key={campaignId}
              className={`border rounded-xl p-6 transition-all duration-200 ${
                hasCampaignData(campaignId)
                  ? 'border-green-200 bg-gradient-to-br from-green-50 to-green-100 dark:border-green-800 dark:from-green-900/20 dark:to-green-900/10 shadow-md'
                  : 'border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-800/30 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                    hasCampaignData(campaignId)
                      ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {campaignId}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                      Campaign {campaignId}
                    </h3>
                  </div>
                </div>
                {hasCampaignData(campaignId) && (
                  <button
                    onClick={() => clearCampaign(campaignId)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                    title={`Clear Campaign ${campaignId}`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              
              {hasCampaignData(campaignId) ? (
                <div className="space-y-3">
                  {/* Editable Campaign Name */}
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Campaign Name</label>
                    <InlineEdit
                      value={campaigns[campaignId].metadata?.name || `Campaign ${campaignId}`}
                      onSave={(newName) => handleCampaignNameUpdate(campaignId, newName)}
                      placeholder={`Campaign ${campaignId}`}
                      className="text-sm font-medium text-gray-900 dark:text-white"
                      inputClassName="w-full text-sm"
                      maxLength={100}
                      validation={(value) => {
                        if (!value.trim()) return "Campaign name cannot be empty";
                        if (value.length > 100) return "Campaign name too long";
                        return null;
                      }}
                    />
                  </div>

                  {/* Editable Campaign Description */}
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description (Optional)</label>
                    <InlineEdit
                      value={campaigns[campaignId].metadata?.description || ''}
                      onSave={(newDescription) => handleCampaignDescriptionUpdate(campaignId, newDescription)}
                      placeholder="Click to add campaign description..."
                      className="text-sm text-gray-700 dark:text-gray-300"
                      inputClassName="w-full text-sm"
                      maxLength={250}
                      multiline={true}
                    />
                  </div>

                  {/* Campaign Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {campaigns[campaignId].data.length.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Records</div>
                    </div>
                    {campaigns[campaignId].metadata?.year && (
                      <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {campaigns[campaignId].metadata.year}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Year</div>
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 rounded p-2">
                    📄 {campaigns[campaignId].metadata?.fileName}
                    {campaigns[campaignId].metadata?.uploadDate && (
                      <div className="mt-1">
                        📅 Uploaded {new Date(campaigns[campaignId].metadata.uploadDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No data uploaded</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Upload a CSV file to get started with Campaign {campaignId}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Enhanced Upload Form */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800/30">
          <div className="flex items-center mb-4">
            <svg className="h-6 w-6 text-pink-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h4 className="font-semibold text-gray-900 dark:text-white">Upload New Campaign</h4>
          </div>
          
          <div className="space-y-4 mb-6">
            {/* Smart Campaign Slot Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Choose Campaign Slot
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['A', 'B'].map(slot => (
                  <button
                    key={slot}
                    onClick={() => setSelectedCampaign(slot)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                      selectedCampaign === slot
                        ? 'border-pink-300 bg-pink-50 dark:border-pink-600 dark:bg-pink-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">Campaign {slot}</span>
                      <div className={`w-3 h-3 rounded-full ${
                        hasCampaignData(slot) 
                          ? 'bg-green-400' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {hasCampaignData(slot) 
                        ? `${campaigns[slot].data.length.toLocaleString()} records - will replace` 
                        : 'Empty slot'
                      }
                    </p>
                    {selectedCampaign === slot && (
                      <div className="mt-2 text-xs text-pink-600 dark:text-pink-400 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Enhanced Campaign Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Campaign Name
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder={`e.g., Q4 2024 Holiday Campaign, Summer Sale ${selectedCampaign}, etc.`}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:text-white transition-colors"
                maxLength={100}
              />
              <div className="mt-1 flex justify-between items-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  💡 Use descriptive names like "Q4 Holiday 2024" or "Summer Sale Test"
                </p>
                <span className="text-xs text-gray-400">{campaignName.length}/100</span>
              </div>
            </div>
          </div>

          {/* Upload Button with Enhanced Design */}
          <div className="text-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={processingFile}
              className="inline-flex items-center px-6 py-3 border border-transparent shadow-lg text-base font-medium rounded-lg text-white bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg 
                className="-ml-1 mr-3 h-5 w-5" 
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
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{processingStage || 'Processing...'}</span>
                </div>
              ) : (
                <span>
                  {hasCampaignData(selectedCampaign) ? `Replace Campaign ${selectedCampaign}` : `Upload to Campaign ${selectedCampaign}`}
                </span>
              )}
            </button>
            <input 
              type="file" 
              className="hidden" 
              accept=".csv" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            
            {/* File format help */}
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              📄 Supports CSV files up to 50MB
              <span className="mx-2">•</span>
              Auto-detects columns and formats
            </p>
          </div>

          {uploadError && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h5 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Upload Error</h5>
                  <div className="text-sm text-red-600 dark:text-red-400">{uploadError}</div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CampaignManager;