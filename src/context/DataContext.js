import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

// Create context
const DataContext = createContext();

// Custom hook to use the data context
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  // Enhanced state for dual dataset comparison
  const [campaigns, setCampaigns] = useState(() => {
    const saved = localStorage.getItem('campaigns');
    return saved ? JSON.parse(saved) : {
      A: { data: [], metadata: null },
      B: { data: [], metadata: null }
    };
  });
  
  // Primary dataset support
  const [salesData, setSalesData] = useState([]);
  const [offerData, setOfferData] = useState([]);
  const [hasOfferData, setHasOfferData] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [clientName, setClientName] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Campaign comparison state
  const [comparisonSettings, setComparisonSettings] = useState(() => {
    const saved = localStorage.getItem('comparisonSettings');
    return saved ? JSON.parse(saved) : {
      mode: 'single',
      activeDatasets: ['A'],
      primaryDataset: 'A'
    };
  });

  // Filter and comparison state removed - handled by FilterContext

  // Active tab state
  const [activeTab, setActiveTab] = useState('summary');

  const [excludedDates, setExcludedDates] = useState(() => {
    const saved = localStorage.getItem('excludedDates');
    return saved ? JSON.parse(saved) : [];
  });

  // Initialize data context on mount and sync with localStorage
  useEffect(() => {
    setDataLoading(false);
    setActiveTab('summary');
    
    // Sync salesData with Campaign A if it exists
    if (campaigns.A.data.length > 0) {
      setSalesData(campaigns.A.data);
    }
  }, [campaigns.A.data, campaigns.A.metadata]);
  
  // Persist campaigns to localStorage with size check
  useEffect(() => {
    try {
      const campaignData = JSON.stringify(campaigns);
      // Check if data size is reasonable (< 4MB to leave room for other localStorage items)
      if (campaignData.length < 4 * 1024 * 1024) {
        localStorage.setItem('campaigns', campaignData);
      } else {
        console.warn('Campaign data too large for localStorage, skipping save');
        // Keep only metadata in localStorage for large datasets
        const metadataOnly = {
          A: { data: [], metadata: campaigns.A.metadata },
          B: { data: [], metadata: campaigns.B.metadata }
        };
        localStorage.setItem('campaigns', JSON.stringify(metadataOnly));
      }
    } catch (error) {
      console.error('Failed to save campaigns to localStorage:', error);
      // Clear localStorage if we're hitting quota limits
      if (error.name === 'QuotaExceededError') {
        try {
          localStorage.removeItem('campaigns');
          console.warn('Cleared campaigns from localStorage due to quota exceeded');
        } catch (clearError) {
          console.error('Failed to clear localStorage:', clearError);
        }
      }
    }
  }, [campaigns]);
  
  // Persist comparison settings to localStorage
  useEffect(() => {
    localStorage.setItem('comparisonSettings', JSON.stringify(comparisonSettings));
  }, [comparisonSettings]);



  // handleProductSelection and handleRetailerSelection removed - handled by FilterContext

  // Helper function to detect campaign year from data
  const detectCampaignYear = useCallback((data) => {
    if (!data || data.length === 0) return null;
    
    // Extract years from receipt_date field
    const years = data
      .map(row => {
        if (!row.receipt_date) return null;
        const date = new Date(row.receipt_date);
        return !isNaN(date.getTime()) ? date.getFullYear() : null;
      })
      .filter(year => year !== null);
    
    if (years.length === 0) return null;
    
    // Find the most common year
    const yearCounts = {};
    years.forEach(year => {
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    });
    
    const mostCommonYear = Object.keys(yearCounts).reduce((a, b) => 
      yearCounts[a] > yearCounts[b] ? a : b
    );
    
    return parseInt(mostCommonYear);
  }, []);
  
  // Campaign management functions
  const setCampaignData = useCallback((campaignId, data, metadata) => {
    // Detect campaign year
    const detectedYear = detectCampaignYear(data);
    
    // Enhanced metadata with year information
    const enhancedMetadata = {
      ...metadata,
      year: detectedYear,
      yearLabel: detectedYear ? detectedYear.toString() : 'Unknown Year'
    };
    
    setCampaigns(prev => ({
      ...prev,
      [campaignId]: {
        data: data || [],
        metadata: enhancedMetadata
      }
    }));
    setLastUpdated(new Date().toISOString());
    
    // If setting Campaign A, also update primary state for compatibility
    if (campaignId === 'A') {
      setSalesData(data || []);
      if (enhancedMetadata?.clientName) {
        setClientName(enhancedMetadata.clientName);
      }
    }
  }, [detectCampaignYear]);
  
  const clearCampaign = useCallback((campaignId) => {
    setCampaigns(prev => ({
      ...prev,
      [campaignId]: { data: [], metadata: null }
    }));
    
    // If clearing Campaign A, also clear primary state
    if (campaignId === 'A') {
      setSalesData([]);
      setClientName('');
    }
  }, []);

  // Update campaign metadata (name, description, etc.)
  const updateCampaignMetadata = useCallback((campaignId, updates) => {
    setCampaigns(prev => ({
      ...prev,
      [campaignId]: {
        ...prev[campaignId],
        metadata: {
          ...prev[campaignId]?.metadata,
          ...updates
        }
      }
    }));
    setLastUpdated(new Date().toISOString());
  }, []);
  
  // Clear all data
  const clearData = useCallback(() => {
    setCampaigns({
      A: { data: [], metadata: null },
      B: { data: [], metadata: null }
    });
    setSalesData([]);
    setOfferData([]);
    setHasOfferData(false);
    setClientName('');
    setComparisonSettings({
      mode: 'single',
      activeDatasets: ['A'],
      primaryDataset: 'A'
    });
    setActiveTab('summary');
  }, []);
  
  // Get active dataset based on comparison settings
  const getActiveDataset = useCallback(() => {
    const { mode, activeDatasets, primaryDataset } = comparisonSettings;
    
    if (mode === 'single' || activeDatasets.length === 1) {
      const campaignId = activeDatasets[0] || primaryDataset;
      return campaigns[campaignId]?.data || [];
    }
    
    // For comparison mode, return primary dataset
    return campaigns[primaryDataset]?.data || [];
  }, [campaigns, comparisonSettings]);
  
  // Get campaign metadata
  const getCampaignMetadata = useCallback((campaignId) => {
    return campaigns[campaignId]?.metadata || null;
  }, [campaigns]);
  
  // Check if campaign has data
  const hasCampaignData = useCallback((campaignId) => {
    return campaigns[campaignId]?.data?.length > 0 || false;
  }, [campaigns]);



  // getAvailableMonths removed - can be derived elsewhere if needed

  // Check if we have data
  const hasData = salesData.length > 0 || hasOfferData || 
                  campaigns.A.data.length > 0 || campaigns.B.data.length > 0;
  
  // Check if we can do campaign comparison
  const canCompare = campaigns.A.data.length > 0 && campaigns.B.data.length > 0;
  
  // Check if we can do yearly comparison (campaigns from different years)
  const canCompareYearly = useMemo(() => {
    if (!canCompare) return false;
    
    const yearA = campaigns.A.metadata?.year;
    const yearB = campaigns.B.metadata?.year;
    
    return yearA && yearB && yearA !== yearB;
  }, [canCompare, campaigns.A.metadata?.year, campaigns.B.metadata?.year]);
  
  // Get year difference for yearly comparison
  const getYearDifference = useCallback(() => {
    if (!canCompareYearly) return 0;
    
    const yearA = campaigns.A.metadata?.year;
    const yearB = campaigns.B.metadata?.year;
    
    return Math.abs(yearA - yearB);
  }, [canCompareYearly, campaigns.A.metadata?.year, campaigns.B.metadata?.year]);
  
  // Get year labels for display
  const getYearLabels = useCallback(() => {
    return {
      A: campaigns.A.metadata?.yearLabel || campaigns.A.metadata?.year || 'Unknown',
      B: campaigns.B.metadata?.yearLabel || campaigns.B.metadata?.year || 'Unknown'
    };
  }, [campaigns.A.metadata, campaigns.B.metadata]);

  // Context value
  const value = {
    // Primary dataset support
    salesData,
    offerData,
    hasOfferData,
    dataLoading,
    dataError,
    clientName,
    hasData,
    activeTab,
    setActiveTab,
    lastUpdated,
    
    // Campaign comparison support
    campaigns,
    comparisonSettings,
    canCompare,
    canCompareYearly,
    getYearDifference,
    getYearLabels,
    
    // Campaign management functions
    setCampaignData,
    clearCampaign,
    clearData,
    updateCampaignMetadata,
    getActiveDataset,
    getCampaignMetadata,
    hasCampaignData,
    setComparisonSettings,
    
    // Setter methods
    setSalesData,
    setOfferData,
    setHasOfferData,
    setDataLoading,
    setDataError,
    setClientName,
    excludedDates,
    setExcludedDates,
  };

  useEffect(() => {
    localStorage.setItem('excludedDates', JSON.stringify(excludedDates));
  }, [excludedDates]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;