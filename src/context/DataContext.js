import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import supabase from '../utils/supabase'; // Import Supabase client
import { processData, analyzeBrands } from '../utils/dataProcessing'; // Import processing functions
import { identifyBrandPrefixes, extractBrandNames } from '../utils/brandDetection'; // Keep for now if analyzeBrands uses it internally, or remove if analyzeBrands handles it

// Create context
const DataContext = createContext();

// Custom hook to use the data context
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  // State for data management
  const [salesData, setSalesData] = useState([]);
  const [offerData, setOfferData] = useState([]);
  const [hasOfferData, setHasOfferData] = useState(false);
  const [dataLoading, setDataLoading] = useState(true); // Renamed loading state
  const [dataError, setDataError] = useState(''); // Renamed error state
  const [brandMapping, setBrandMapping] = useState({});
  const [brandNames, setBrandNames] = useState([]);
  const [clientName, setClientName] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  // Filter and comparison state removed - handled by FilterContext

  // Active tab state
  const [activeTab, setActiveTab] = useState('summary');

  const [excludedDates, setExcludedDates] = useState(() => {
    const saved = localStorage.getItem('excludedDates');
    return saved ? JSON.parse(saved) : [];
  });

  // Fetch data from Supabase on mount
  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      setDataError('');
      console.log('Fetching data from Supabase...');

      try {
        const { data: rawSalesData, error: supabaseError } = await supabase
          .from('sales_data') // Make sure 'sales_data' matches your table name
          .select('*');

        if (supabaseError) {
          throw supabaseError;
        }

        if (rawSalesData && rawSalesData.length > 0) {
          console.log(`Fetched ${rawSalesData.length} sales records.`);
          // 1. Process raw data (add month, day_of_week etc.)
          const processedSalesData = processData(rawSalesData);
          setSalesData(processedSalesData);
          console.log('Sales data processed.');

          // 2. Analyze brands from processed data
          const { brandMapping: detectedMapping, brandNames: detectedNames } = analyzeBrands(processedSalesData);
          setBrandMapping(detectedMapping);
          setBrandNames(detectedNames);
          console.log('Brands analyzed:', detectedNames);

          // 3. Set client name from brands if not already set
          if (detectedNames && detectedNames.length > 0) {
            const brandClientName = detectedNames.join(', ');
            // Check if clientName state is empty before setting
            setClientName(prevClientName => {
              if (!prevClientName) {
                console.log("Setting client name from brands:", brandClientName);
                return brandClientName;
              }
              console.log("Keeping existing client name:", prevClientName);
              return prevClientName;
            });
          }
          setActiveTab('summary'); // Default to summary tab after load
        } else {
          console.log('No sales data found in Supabase.');
          setSalesData([]); // Ensure data is empty array if nothing found
        }

      } catch (error) {
        console.error('Error fetching or processing sales data:', error);
        setDataError(`Failed to load sales data: ${error.message}`);
        setSalesData([]); // Clear data on error
        setBrandMapping({});
        setBrandNames([]);
      } finally {
        setDataLoading(false);
        console.log('Data fetching process complete.');
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // TODO: Add similar fetching logic for offerData if it's also moving to Supabase



  // handleProductSelection and handleRetailerSelection removed - handled by FilterContext

  // Clear all data
  const clearData = useCallback(() => {
    setSalesData([]);
    setOfferData([]);
    setHasOfferData(false);
    setBrandMapping({});
    setBrandNames([]);
    setClientName('');
    // Reset filter state is now handled in FilterContext or component level
    setActiveTab('summary');
  }, []);



  // getAvailableMonths removed - can be derived elsewhere if needed

  // Check if we have data
  const hasData = salesData.length > 0 || hasOfferData;

  // Context value - IMPORTANT: Include all functions and state!
  const value = {
    salesData,
    offerData,
    hasOfferData,
    dataLoading, // Use new state names
    dataError,   // Use new state names
    brandMapping,
    brandNames,
    clientName,
    hasData,
    activeTab,
    setActiveTab,
    // Filter/Comparison state removed
    // handleFileUpload removed
    // Selection handlers removed
    // Filter/Comparison setters removed
    clearData, // Keep clearData, but update it
    // getAvailableMonths removed
    // Setter methods needed for components
    setSalesData, // Keep raw data setters if needed internally or for clearing
    setOfferData, // Keep raw data setters
    setHasOfferData,
    setDataLoading, // Use correct setter name
    setDataError,   // Add the setDataError function
    setBrandMapping, // Keep brand setters
    setBrandNames,   // Keep brand setters
    setClientName,
    darkMode,
    setDarkMode,
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