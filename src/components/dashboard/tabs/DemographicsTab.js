import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useFilter } from '../../../context/FilterContext';
import { useTheme } from '../../../context/ThemeContext'; // ← Add this import
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { calculateProductRatings, calculateRepurchaseIntent, filterSalesData } from '../../../utils/dataProcessing';
import StarRating from '../../common/StarRating';
import ExportButton from '../export/ExportButton';

// Custom colors for light and dark mode
const LIGHT_COLORS = ['#FF0066', '#0066CC', '#FFC107', '#00ACC1', '#9C27B0', '#4CAF50', '#FF9800'];
const DARK_COLORS = ['#FF4D94', '#4D94FF', '#FFD54F', '#4DD0E1', '#CE93D8', '#81C784', '#FFB74D'];

// Define the preferred sorting order for age groups
const AGE_GROUP_ORDER = [
  '16-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
  'Under 18'
];


const DemographicsTab = ({ isSharedView }) => {
  // Get data contexts
  const dataContext = useData();
  const filterContext = useFilter(); // Get filter context
  const { 
    salesData,
    brandMapping = {},
    campaigns,
    comparisonSettings,
    canCompare
  } = dataContext;
  
  const { darkMode } = useTheme();
  
  // Get active dataset for primary analysis
  const activeDataset = useMemo(() => {
    if (comparisonSettings?.mode === 'campaigns' && canCompare) {
      return campaigns[comparisonSettings.primaryDataset]?.data || [];
    }
    return salesData || [];
  }, [salesData, campaigns, comparisonSettings, canCompare]);

  // Get comparison dataset
  const comparisonDataset = useMemo(() => {
    if (comparisonSettings?.mode === 'campaigns' && canCompare) {
      const otherCampaign = comparisonSettings.primaryDataset === 'A' ? 'B' : 'A';
      return campaigns[otherCampaign]?.data || [];
    }
    return [];
  }, [campaigns, comparisonSettings, canCompare]);

  // Calculate filteredData using useMemo to respect filters
  const filteredData = useMemo(() => {
    try {
      if (!activeDataset || !Array.isArray(activeDataset) || activeDataset.length === 0) {
        return [];
      }
      
      if (!filterContext || !filterContext.filters) {
        return activeDataset; // If no filter context, return raw data
      }
      
      return filterSalesData(activeDataset, filterContext.filters);
    } catch (error) {
      console.error('Error filtering demographics data:', error);
      return activeDataset || [];
    }
  }, [activeDataset, filterContext]);

  // Calculate filtered comparison data
  const filteredComparisonData = useMemo(() => {
    try {
      if (!comparisonDataset || !Array.isArray(comparisonDataset) || comparisonDataset.length === 0 || comparisonSettings?.mode !== 'campaigns') {
        return [];
      }
      
      if (!filterContext || !filterContext.filters) {
        return comparisonDataset;
      }
      
      return filterSalesData(comparisonDataset, filterContext.filters);
    } catch (error) {
      console.error('Error filtering comparison demographics data:', error);
      return [];
    }
  }, [comparisonDataset, filterContext, comparisonSettings]);

  // Calculate overall demographics for comparison mode
  const calculateOverallDemographics = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { gender: [], age: [] };
    }

    // Gender breakdown
    const genderCounts = {};
    data.forEach(row => {
      const gender = row.gender || 'Not Specified';
      genderCounts[gender] = (genderCounts[gender] || 0) + 1;
    });

    const totalGender = Object.values(genderCounts).reduce((sum, count) => sum + count, 0);
    const genderData = Object.entries(genderCounts).map(([name, value]) => ({
      name,
      value,
      total: totalGender,
      percentage: totalGender > 0 ? ((value / totalGender) * 100).toFixed(1) : "0.0"
    }));

    // Age breakdown
    const ageCounts = {};
    data.forEach(row => {
      const age = row.age_group || 'Not Specified';
      let ageGroup = age;
      
      // If the age is a number, convert it to a group
      if (age && !isNaN(age)) {
        const ageNum = parseInt(age, 10);
        if (ageNum < 18) ageGroup = 'Under 18';
        else if (ageNum < 25) ageGroup = '16-24';
        else if (ageNum < 35) ageGroup = '25-34';
        else if (ageNum < 45) ageGroup = '35-44';
        else if (ageNum < 55) ageGroup = '45-54';
        else if (ageNum < 65) ageGroup = '55-64';
        else ageGroup = '65+';
      }
      
      ageCounts[ageGroup] = (ageCounts[ageGroup] || 0) + 1;
    });
    
    const totalAge = Object.values(ageCounts).reduce((sum, count) => sum + count, 0);
    const ageData = Object.entries(ageCounts).map(([name, value]) => ({
      name,
      value,
      total: totalAge,
      percentage: totalAge > 0 ? ((value / totalAge) * 100).toFixed(1) : "0.0"
    }));
    
    // Sort age groups in logical order
    ageData.sort((a, b) => {
      const aIndex = AGE_GROUP_ORDER.indexOf(a.name);
      const bIndex = AGE_GROUP_ORDER.indexOf(b.name);
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      return a.name.localeCompare(b.name);
    });

    return { gender: genderData, age: ageData };
  };

  // Calculate comparison demographics
  const primaryDemographics = useMemo(() => {
    return calculateOverallDemographics(filteredData);
  }, [filteredData]);
  
  const comparisonDemographics = useMemo(() => {
    return calculateOverallDemographics(filteredComparisonData);
  }, [filteredComparisonData]);

  // Campaign labels
  const campaignLabels = useMemo(() => {
    if (!comparisonSettings || !campaigns) return { primary: '', comparison: '' };
    return {
      primary: campaigns[comparisonSettings.primaryDataset]?.name || `Campaign ${comparisonSettings.primaryDataset}`,
      comparison: campaigns[comparisonSettings.primaryDataset === 'A' ? 'B' : 'A']?.name || `Campaign ${comparisonSettings.primaryDataset === 'A' ? 'B' : 'A'}`
    };
  }, [campaigns, comparisonSettings]);
  
  // Use direct data in shared view
  // const dataToUse = isSharedView && directFilteredData ? directFilteredData : salesData;

  // const hiddenCharts = isSharedView && clientData?.hiddenCharts ? clientData.hiddenCharts : [];
  
  // Use refs to track component mounting state
  const isMounted = useRef(true);
  
  // State variables
  const [responseByGender, setResponseByGender] = useState([]);
  const [responseByAge, setResponseByAge] = useState([]); 
  const [isProcessingDemographics, setIsProcessingDemographics] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [responseData, setResponseData] = useState([]);
  const [selectedResponses, setSelectedResponses] = useState([]);
  const [questions, setQuestions] = useState([]);
  
  // Product ratings and repurchase intent state
  const [productRatings, setProductRatings] = useState([]);
  const [repurchaseIntent, setRepurchaseIntent] = useState([]);
  const [showProductInsights, setShowProductInsights] = useState(false);
  
  // Export data state
  const [exportData, setExportData] = useState(null);
  
  // Product-specific demographics state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDemographics, setProductDemographics] = useState({
    gender: [],
    age: []
  });
  
  
  // Extract questions from data
  useEffect(() => {
    if (filteredData && filteredData.length > 0) {
      // Check what fields are in the data
      const sampleRow = filteredData[0];
      
      // Look for question fields
      const questionFields = [];
      for (let i = 1; i <= 10; i++) {
        const paddedNum = i.toString().padStart(2, '0');
        const questionKey = `question_${paddedNum}`;
        const propKey = `proposition_${paddedNum}`;
        
        if (sampleRow[questionKey] !== undefined || sampleRow[propKey] !== undefined) {
          questionFields.push({
            number: paddedNum,
            questionKey,
            propKey
          });
        }
      }
      
      // Create question objects
      const extractedQuestions = [];
      questionFields.forEach(field => {
        // Try to get the question text from the data
        let questionText = `Question ${parseInt(field.number)}`;
        
        // Find the first row with a non-empty question text
        for (const row of filteredData) {
          if (row[field.questionKey] && typeof row[field.questionKey] === 'string' && row[field.questionKey].trim() !== '') {
            questionText = row[field.questionKey];
            break;
          }
        }
        
        // Only add if there are propositions for this question
        const hasPropositions = filteredData.some(row => 
          row[field.propKey] && 
          typeof row[field.propKey] === 'string' && 
          row[field.propKey].trim() !== ''
        );
        
        if (hasPropositions) {
          extractedQuestions.push({ 
            number: field.number, 
            text: questionText
          });
        }
      });
      
      setQuestions(extractedQuestions);
      setAvailableQuestions(extractedQuestions.map(q => q.number));
    }
  }, [filteredData]);

  // Calculate product ratings and repurchase intent when data changes
  useEffect(() => {
    if (filteredData && filteredData.length > 0) {
      try {
        // Calculate product ratings
        const ratings = calculateProductRatings(filteredData, brandMapping);
        setProductRatings(ratings);
        
        // Calculate repurchase intent
        const repurchase = calculateRepurchaseIntent(filteredData, brandMapping);
        setRepurchaseIntent(repurchase);
        
        // Show product insights section if we have either ratings or repurchase data
        setShowProductInsights(ratings.length > 0 || repurchase.length > 0);
      } catch (error) {
        console.error('Error calculating product insights:', error);
        setProductRatings([]);
        setRepurchaseIntent([]);
        setShowProductInsights(false);
      }
    } else {
      setProductRatings([]);
      setRepurchaseIntent([]);
      setShowProductInsights(false);
    }
  }, [filteredData, brandMapping]);

  // Set up mounted ref for cleanup
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
 // Process demographic data when responses are selected
 useEffect(() => {
  // Skip if unmounted
  if (!isMounted.current) return;
  
  // Only process if we have selected responses and survey data
  if (selectedResponses.length > 0 && filteredData && filteredData.length > 0) {
    // Set processing flag to true
    setIsProcessingDemographics(true);
    
    // Use setTimeout to ensure React has time to render the loading state
    setTimeout(() => {
      // Skip if component unmounted during timeout
      if (!isMounted.current) return;
      
      try {
        // Get selected response text values
        const selectedResponseValues = selectedResponses.map(r => r.fullResponse);
        const propKey = `proposition_${selectedQuestionNumber}`;
        
        // Filter survey data for rows containing ANY of the selected responses
        // Modified to check if any of the selected responses are present in each comma-separated response
        const filteredSurveyData = filteredData.filter(row => {
          const responseStr = row[propKey];
          if (!responseStr) return false;
          
          // Split by semicolon if it's a multiple-choice response 
          const responses = responseStr.split(';').map(r => r.trim());
          
          // Check if any of the selected responses are in this row's responses
          return responses.some(resp => selectedResponseValues.includes(resp));
        });
        
        // Gender breakdown
        const genderCounts = {};
        filteredSurveyData.forEach(row => {
          const gender = row.gender || 'Not Specified';
          genderCounts[gender] = (genderCounts[gender] || 0) + 1;
        });
        
        const totalGender = Object.values(genderCounts).reduce((sum, count) => sum + count, 0);
        
        const genderData = Object.entries(genderCounts).map(([name, value]) => ({
          name,
          value,
          total: totalGender,
          percentage: ((value / totalGender) * 100).toFixed(1)
        }));
      
        // Age breakdown
        const ageCounts = {};
        filteredSurveyData.forEach(row => {
          // Log a sample row to debug data structure
          if (!window.loggedSampleRow) {
            window.loggedSampleRow = true;
          }
          
          const age = row.age_group || 'Not Specified';
          let ageGroup = age;
          
          // If the age is a number, convert it to a group
          if (age && !isNaN(age)) {
            const ageNum = parseInt(age, 10);
            if (ageNum < 18) ageGroup = 'Under 18';
            else if (ageNum < 25) ageGroup = '18-24';
            else if (ageNum < 35) ageGroup = '25-34';
            else if (ageNum < 45) ageGroup = '35-44';
            else if (ageNum < 55) ageGroup = '45-54';
            else if (ageNum < 65) ageGroup = '55-64';
            else ageGroup = '65+';
          }
          
          ageCounts[ageGroup] = (ageCounts[ageGroup] || 0) + 1;
        });
        
        const totalAge = Object.values(ageCounts).reduce((sum, count) => sum + count, 0);
        
        const ageData = Object.entries(ageCounts).map(([name, value]) => ({
          name,
          value,
          total: totalAge,
          percentage: ((value / totalAge) * 100).toFixed(1)
        }));
        
        // Sort age groups in a logical order if possible
        ageData.sort((a, b) => {
          const aIndex = AGE_GROUP_ORDER.indexOf(a.name);
          const bIndex = AGE_GROUP_ORDER.indexOf(b.name);
          
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          
          return a.name.localeCompare(b.name);
        });
              
        // Skip update if component unmounted
        if (!isMounted.current) return;
        
        // First update the data
        setResponseByGender(genderData);
        setResponseByAge(ageData);
        
        // Then remove processing flag to show the data
        setIsProcessingDemographics(false);
      } catch (error) {
        console.error("Error processing demographic data:", error);
        // Reset processing flag even on error
        if (isMounted.current) {
          setIsProcessingDemographics(false);
        }
      }
    }, 100); // Short delay to ensure state updates properly
  } else if (selectedResponses.length === 0) {
    // Only clear if no responses are selected
    setResponseByGender([]);
    setResponseByAge([]);
    setIsProcessingDemographics(false);
  }
}, [selectedResponses, filteredData, selectedQuestionNumber]);

  // Handle user changing the selected question
  const handleQuestionChange = (e) => {
    const questionNum = e.target.value;
    setSelectedQuestionNumber(questionNum);
    setSelectedResponses([]);
    
    if (questionNum) {
      // Find the question text
      const question = questions.find(q => q.number === questionNum);
      setQuestionText(question ? question.text : `Question ${parseInt(questionNum)}`);
      
      // Analyze responses for this question
      analyzeResponses(questionNum);
    } else {
      setQuestionText('');
      setResponseData([]);
    }
  };

  const analyzeResponses = (questionNum) => {
    if (!filteredData || filteredData.length === 0) {
      return;
    }
    
    // Define the key for this question's proposition
    const propKey = `proposition_${questionNum}`;
    
    // Check if the proposition field exists in the data
    const propExists = filteredData.some(row => row[propKey] !== undefined);
    
    if (!propExists) {
      setResponseData([]);
      return;
    }
    
    // Filter responses that have non-empty propositions
    const responses = filteredData.filter(row => 
      row[propKey] !== undefined && 
      row[propKey] !== null && 
      row[propKey] !== '');
    
    if (responses.length === 0) {
      setResponseData([]);
      return;
    }
    
    // Set the total number of respondents
    const totalResponses = responses.length;
    
    // Count occurrences of each INDIVIDUAL response
    const individualResponseCounts = {};
    
    responses.forEach(row => {
      const responseStr = row[propKey];
      if (!responseStr) return;
      
      // Split by semicolon if it's a multiple-choice response
      const individualResponses = responseStr.split(';').map(r => r.trim());
      
      // Count each individual response
      individualResponses.forEach(response => {
        // Skip empty responses
        if (!response) return;
        individualResponseCounts[response] = (individualResponseCounts[response] || 0) + 1;
      });
    });
    
    // Convert to array for display
    const responseArray = Object.entries(individualResponseCounts).map(([fullResponse, count]) => {
      const percentage = ((count / totalResponses) * 100).toFixed(1);
      return { fullResponse, count, percentage };
    });
    
    // Sort by count (descending)
    responseArray.sort((a, b) => b.count - a.count);
    
    setResponseData(responseArray);
  };

  // Handle user selecting a response
  const handleResponseClick = (response) => {
    const isSelected = selectedResponses.some(r => r.fullResponse === response.fullResponse);
    
    if (isSelected) {
      setSelectedResponses(prev => {
        const newSelection = prev.filter(r => r.fullResponse !== response.fullResponse);
        return newSelection;
      });
    } else {
      setSelectedResponses(prev => {
        const newSelection = [...prev, response];
        return newSelection;
      });
    }
  };


  // Calculate demographics for a specific product
  const calculateProductDemographics = (productName) => {
    if (!filteredData || filteredData.length === 0 || !productName) {
      return { gender: [], age: [] };
    }

    // Filter data for the selected product
    const productData = filteredData.filter(row => row.product_name === productName);

    if (productData.length === 0) {
      return { gender: [], age: [] };
    }

    // Gender breakdown
    const genderCounts = {};
    productData.forEach(row => {
      const gender = row.gender || 'Not Specified';
      genderCounts[gender] = (genderCounts[gender] || 0) + 1;
    });

    const totalGender = Object.values(genderCounts).reduce((sum, count) => sum + count, 0);
    const genderData = Object.entries(genderCounts).map(([name, value]) => ({
      name,
      value,
      total: totalGender,
      percentage: totalGender > 0 ? ((value / totalGender) * 100).toFixed(1) : "0.0"
    }));

    // Age breakdown
    const ageCounts = {};
    productData.forEach(row => {
      const age = row.age_group || 'Not Specified';
      let ageGroup = age;
      
      // If the age is a number, convert it to a group
      if (age && !isNaN(age)) {
        const ageNum = parseInt(age, 10);
        if (ageNum < 18) ageGroup = 'Under 18';
        else if (ageNum < 25) ageGroup = '16-24';
        else if (ageNum < 35) ageGroup = '25-34';
        else if (ageNum < 45) ageGroup = '35-44';
        else if (ageNum < 55) ageGroup = '45-54';
        else if (ageNum < 65) ageGroup = '55-64';
        else ageGroup = '65+';
      }
      
      ageCounts[ageGroup] = (ageCounts[ageGroup] || 0) + 1;
    });
    
    const totalAge = Object.values(ageCounts).reduce((sum, count) => sum + count, 0);
    const ageData = Object.entries(ageCounts).map(([name, value]) => ({
      name,
      value,
      total: totalAge,
      percentage: totalAge > 0 ? ((value / totalAge) * 100).toFixed(1) : "0.0"
    }));
    
    // Sort age groups in logical order
    ageData.sort((a, b) => {
      const aIndex = AGE_GROUP_ORDER.indexOf(a.name);
      const bIndex = AGE_GROUP_ORDER.indexOf(b.name);
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      return a.name.localeCompare(b.name);
    });

    return { gender: genderData, age: ageData };
  };

  // Handle product click
  const handleProductClick = (product) => {
    const productName = product.name || product.displayName;
    setSelectedProduct(productName);
    const demographics = calculateProductDemographics(productName);
    setProductDemographics(demographics);
  };

  // Clear product selection
  const clearProductSelection = () => {
    setSelectedProduct(null);
    setProductDemographics({ gender: [], age: [] });
  };

  // Prepare export data whenever the relevant data changes
  useEffect(() => {
    if (selectedQuestionNumber && responseData.length > 0) {
      const data = {
        responses: responseData,
        genderBreakdown: responseByGender,
        ageBreakdown: responseByAge,
        selectedResponses: selectedResponses,
        questionNumber: selectedQuestionNumber,
        questionText: questionText,
        productRatings: productRatings,
        repurchaseIntent: repurchaseIntent
      };
      setExportData(data);
    } else if (showProductInsights && (productRatings.length > 0 || repurchaseIntent.length > 0)) {
      // If no question is selected but we have product insights, export those
      const data = {
        productRatings: productRatings,
        repurchaseIntent: repurchaseIntent,
        responses: [],
        genderBreakdown: [],
        ageBreakdown: [],
        selectedResponses: [],
        questionNumber: null,
        questionText: ''
      };
      setExportData(data);
    } else {
      setExportData(null);
    }
  }, [selectedQuestionNumber, responseData, responseByGender, responseByAge, selectedResponses, questionText, productRatings, repurchaseIntent, showProductInsights]);
  
  // If no data or no questions, show empty state
  if (!filteredData || filteredData.length === 0 || availableQuestions.length === 0) {
    return (
      <div className={`flex justify-center items-center h-64 ${darkMode ? 'bg-gray-900 text-gray-200' : 'text-gray-900'}`}>
        <div className="text-center">
          <svg className={`mx-auto h-12 w-12 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className={`mt-2 text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>No survey data available</h3>
          <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Please upload an items_purchased.CSV file for sales data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`demographics-tab p-4 ${darkMode ? 'bg-gray-900 text-white' : ''}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : ''}`}>Demographics Insights</h2>
        {exportData && (
          <ExportButton activeTab="demographics" tabData={exportData} />
        )}
      </div>

      {/* Campaign Comparison Overview */}
      {comparisonSettings?.mode === 'campaigns' && canCompare && (
        <div className={`mb-6 p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow`}>
          <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Campaign Comparison Overview</h3>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Gender Comparison */}
                <div>
                  <h4 className={`text-md font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Gender Distribution Comparison
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Primary Campaign Gender */}
                    <div>
                      <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}>
                        {campaignLabels.primary}
                      </h5>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={primaryDemographics.gender} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 10 }}
                              angle={-45}
                              textAnchor="end"
                              height={40}
                            />
                            <YAxis tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 10 }} />
                            <Tooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} p-2 border shadow-lg rounded-lg`}>
                                      <p className={`text-xs font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{label}</p>
                                      <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{payload[0].value} ({payload[0].payload.percentage}%)</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="value" fill={darkMode ? '#FF4D94' : '#FF0066'} radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    {/* Comparison Campaign Gender */}
                    <div>
                      <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {campaignLabels.comparison}
                      </h5>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={comparisonDemographics.gender} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 10 }}
                              angle={-45}
                              textAnchor="end"
                              height={40}
                            />
                            <YAxis tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 10 }} />
                            <Tooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} p-2 border shadow-lg rounded-lg`}>
                                      <p className={`text-xs font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{label}</p>
                                      <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{payload[0].value} ({payload[0].payload.percentage}%)</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="value" fill={darkMode ? '#4D94FF' : '#0066CC'} radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Age Comparison */}
                <div>
                  <h4 className={`text-md font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Age Distribution Comparison
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Primary Campaign Age */}
                    <div>
                      <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}>
                        {campaignLabels.primary}
                      </h5>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={primaryDemographics.age} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 9 }}
                              angle={-45}
                              textAnchor="end"
                              height={40}
                            />
                            <YAxis tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 10 }} />
                            <Tooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} p-2 border shadow-lg rounded-lg`}>
                                      <p className={`text-xs font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{label}</p>
                                      <p className={`text-xs ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{payload[0].value} ({payload[0].payload.percentage}%)</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="value" fill={darkMode ? '#CE93D8' : '#9C27B0'} radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    {/* Comparison Campaign Age */}
                    <div>
                      <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {campaignLabels.comparison}
                      </h5>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={comparisonDemographics.age} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 9 }}
                              angle={-45}
                              textAnchor="end"
                              height={40}
                            />
                            <YAxis tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 10 }} />
                            <Tooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} p-2 border shadow-lg rounded-lg`}>
                                      <p className={`text-xs font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{label}</p>
                                      <p className={`text-xs ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{payload[0].value} ({payload[0].payload.percentage}%)</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="value" fill={darkMode ? '#81C784' : '#4CAF50'} radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
        </div>
      )}

      {/* Product Insights Section */}
      {showProductInsights && (
        <div className={`mb-6 p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow`}>
          <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Product Insights</h3>
          
          {/* Product Ratings */}
          {productRatings.length > 0 && (
            <div className="mb-6">
              <h4 className={`text-md font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Average Star Ratings
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ratings Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={productRatings}
                      margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                      barCategoryGap="20%"
                    >
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke={darkMode ? '#374151' : '#e5e7eb'}
                        strokeOpacity={0.6}
                      />
                      <XAxis 
                        dataKey="displayName"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                        tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 11 }}
                        axisLine={{ stroke: darkMode ? '#6b7280' : '#374151', strokeWidth: 1 }}
                        tickLine={{ stroke: darkMode ? '#6b7280' : '#374151' }}
                      />
                      <YAxis 
                        domain={[0, 5]}
                        tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 12 }}
                        axisLine={{ stroke: darkMode ? '#6b7280' : '#374151', strokeWidth: 1 }}
                        tickLine={{ stroke: darkMode ? '#6b7280' : '#374151' }}
                        label={{ 
                          value: 'Rating (1-5 stars)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle', fill: darkMode ? '#d1d5db' : '#374151' }
                        }}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} p-4 border shadow-lg rounded-lg`}>
                                <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{label}</p>
                                <p className={`text-sm ${darkMode ? 'text-yellow-400' : 'text-yellow-600'} font-medium`}>
                                  ⭐ {data.avgRating?.toFixed(2)} stars
                                </p>
                                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                                  Based on {data.ratingResponses} responses
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="avgRating" 
                        name="Average Rating" 
                        fill={darkMode ? '#fbbf24' : '#f59e0b'}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Ratings Table */}
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg max-h-80 overflow-y-auto`}>
                  <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                    <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                      <tr>
                        <th scope="col" className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Product
                        </th>
                        <th scope="col" className={`px-4 py-3 text-center text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Rating
                        </th>
                        <th scope="col" className={`px-4 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Responses
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${darkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
                      {productRatings.map((product, index) => (
                        <tr key={index}>
                          <td className={`px-4 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            <button
                              onClick={() => handleProductClick(product)}
                              className={`text-left hover:underline focus:outline-none focus:underline transition-colors duration-150 ${
                                selectedProduct === product.displayName 
                                  ? darkMode ? 'text-pink-400' : 'text-pink-600'
                                  : darkMode ? 'text-white hover:text-gray-300' : 'text-gray-900 hover:text-gray-700'
                              }`}
                            >
                              {product.displayName}
                            </button>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <StarRating 
                              rating={product.avgRating} 
                              size="sm" 
                              showValue={true}
                              showCount={false}
                            />
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-right`}>
                            {product.ratingResponses}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Repurchase Intent */}
          {repurchaseIntent.length > 0 && (
            <div className="mb-6">
              <h4 className={`text-md font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Repurchase Intent
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Repurchase Intent Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={repurchaseIntent}
                      margin={{ top: 20, right: 30, left: 30, bottom: 100 }}
                      barCategoryGap="20%"
                    >
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke={darkMode ? '#374151' : '#e5e7eb'}
                        strokeOpacity={0.6}
                      />
                      <XAxis 
                        dataKey="displayName"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                        tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 11 }}
                        axisLine={{ stroke: darkMode ? '#6b7280' : '#374151', strokeWidth: 1 }}
                        tickLine={{ stroke: darkMode ? '#6b7280' : '#374151' }}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 12 }}
                        axisLine={{ stroke: darkMode ? '#6b7280' : '#374151', strokeWidth: 1 }}
                        tickLine={{ stroke: darkMode ? '#6b7280' : '#374151' }}
                        label={{ 
                          value: 'Repurchase Intent (%)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle', fill: darkMode ? '#d1d5db' : '#374151' }
                        }}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} p-4 border shadow-lg rounded-lg`}>
                                <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{label}</p>
                                <p className={`text-sm font-medium ${
                                  data.repurchaseIntentRate >= 70 
                                    ? `${darkMode ? 'text-green-400' : 'text-green-600'}` 
                                    : data.repurchaseIntentRate >= 50 
                                    ? `${darkMode ? 'text-yellow-400' : 'text-yellow-600'}` 
                                    : `${darkMode ? 'text-red-400' : 'text-red-600'}`
                                }`}>
                                  📈 {data.repurchaseIntentRate?.toFixed(1)}% Intent
                                </p>
                                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                                  Based on {data.repurchaseResponses} responses
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="repurchaseIntentRate" 
                        name="Repurchase Intent %" 
                        fill={darkMode ? '#10b981' : '#059669'}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Repurchase Intent Table */}
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg max-h-80 overflow-y-auto`}>
                  <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                    <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                      <tr>
                        <th scope="col" className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Product
                        </th>
                        <th scope="col" className={`px-4 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Intent %
                        </th>
                        <th scope="col" className={`px-4 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Responses
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${darkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
                      {repurchaseIntent.map((product, index) => (
                        <tr key={index}>
                          <td className={`px-4 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            <button
                              onClick={() => handleProductClick(product)}
                              className={`text-left hover:underline focus:outline-none focus:underline transition-colors duration-150 ${
                                selectedProduct === product.displayName 
                                  ? darkMode ? 'text-pink-400' : 'text-pink-600'
                                  : darkMode ? 'text-white hover:text-gray-300' : 'text-gray-900 hover:text-gray-700'
                              }`}
                            >
                              {product.displayName}
                            </button>
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-right`}>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              product.repurchaseIntentRate >= 70 
                                ? `${darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'}` 
                                : product.repurchaseIntentRate >= 50 
                                ? `${darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800'}` 
                                : `${darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800'}`
                            }`}>
                              {product.repurchaseIntentRate?.toFixed(1)}%
                            </span>
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-right`}>
                            {product.repurchaseResponses}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* Explanation */}
          <div className={`${darkMode ? 'bg-blue-900 border-blue-800' : 'bg-blue-50 border-blue-200'} p-4 rounded-lg border`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>About Product Insights</h3>
                <div className={`mt-2 text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  <p>
                    <strong>Star Ratings:</strong> Average ratings from the 'rating' field (1-5 stars).
                  </p>
                  <p className="mt-1">
                    <strong>Repurchase Intent:</strong> Percentage of customers who answered "Yes, definitely" or "Yes, why not" 
                    to the repurchase question.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product-Specific Demographics Section */}
      {selectedProduct && (
        <div className={`mb-6 p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Demographics for "{selectedProduct}"
            </h3>
            <button
              onClick={clearProductSelection}
              className={`px-3 py-1 text-sm rounded-md transition-colors duration-150 ${
                darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Clear Selection
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gender Breakdown */}
            <div>
              <h4 className={`text-md font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Gender Distribution
              </h4>
              {productDemographics.gender.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {/* Gender Chart */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={productDemographics.gender}
                        margin={{ top: 20, right: 30, left: 30, bottom: 40 }}
                        barCategoryGap="20%"
                      >
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          stroke={darkMode ? '#374151' : '#e5e7eb'}
                          strokeOpacity={0.6}
                        />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 12 }}
                          axisLine={{ stroke: darkMode ? '#6b7280' : '#374151', strokeWidth: 1 }}
                          tickLine={{ stroke: darkMode ? '#6b7280' : '#374151' }}
                        />
                        <YAxis 
                          tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 12 }}
                          axisLine={{ stroke: darkMode ? '#6b7280' : '#374151', strokeWidth: 1 }}
                          tickLine={{ stroke: darkMode ? '#6b7280' : '#374151' }}
                          label={{ 
                            value: 'Count', 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { textAnchor: 'middle', fill: darkMode ? '#d1d5db' : '#374151' }
                          }}
                        />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} p-4 border shadow-lg rounded-lg`}>
                                  <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{label}</p>
                                  <p className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                                    👥 {payload[0].value} customers
                                  </p>
                                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                                    {payload[0].payload.percentage}% of total
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="value" name="Count">
                          {productDemographics.gender.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={darkMode ? DARK_COLORS[index % DARK_COLORS.length] : LIGHT_COLORS[index % LIGHT_COLORS.length]}
                              radius={[4, 4, 0, 0]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Gender Table */}
                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                      <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                        <tr>
                          <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Gender</th>
                          <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Count</th>
                          <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Percentage</th>
                        </tr>
                      </thead>
                      <tbody className={`${darkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
                        {productDemographics.gender.map((item, index) => (
                          <tr key={index}>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              <div className="flex items-center">
                                <div 
                                  className="h-3 w-3 rounded-full mr-2" 
                                  style={{ 
                                    backgroundColor: darkMode 
                                      ? DARK_COLORS[index % DARK_COLORS.length] 
                                      : LIGHT_COLORS[index % LIGHT_COLORS.length] 
                                  }}
                                ></div>
                                {item.name}
                              </div>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-right`}>{item.value}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-right`}>{item.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg flex items-center justify-center h-20`}>
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>No gender data available for this product</p>
                </div>
              )}
            </div>

            {/* Age Breakdown */}
            <div>
              <h4 className={`text-md font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Age Distribution
              </h4>
              {productDemographics.age.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {/* Age Chart */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={productDemographics.age}
                        margin={{ top: 20, right: 30, left: 30, bottom: 40 }}
                        barCategoryGap="15%"
                      >
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          stroke={darkMode ? '#374151' : '#e5e7eb'}
                          strokeOpacity={0.6}
                        />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 11 }}
                          axisLine={{ stroke: darkMode ? '#6b7280' : '#374151', strokeWidth: 1 }}
                          tickLine={{ stroke: darkMode ? '#6b7280' : '#374151' }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 12 }}
                          axisLine={{ stroke: darkMode ? '#6b7280' : '#374151', strokeWidth: 1 }}
                          tickLine={{ stroke: darkMode ? '#6b7280' : '#374151' }}
                          label={{ 
                            value: 'Count', 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { textAnchor: 'middle', fill: darkMode ? '#d1d5db' : '#374151' }
                          }}
                        />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} p-4 border shadow-lg rounded-lg`}>
                                  <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{label}</p>
                                  <p className={`text-sm ${darkMode ? 'text-purple-400' : 'text-purple-600'} font-medium`}>
                                    🎂 {payload[0].value} customers
                                  </p>
                                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                                    {payload[0].payload.percentage}% of total
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="value" name="Count">
                          {productDemographics.age.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={darkMode ? DARK_COLORS[(index + 4) % DARK_COLORS.length] : LIGHT_COLORS[(index + 4) % LIGHT_COLORS.length]}
                              radius={[4, 4, 0, 0]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Age Table */}
                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                      <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                        <tr>
                          <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Age Group</th>
                          <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Count</th>
                          <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Percentage</th>
                        </tr>
                      </thead>
                      <tbody className={`${darkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
                        {productDemographics.age.map((item, index) => (
                          <tr key={index}>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              <div className="flex items-center">
                                <div 
                                  className="h-3 w-3 rounded-full mr-2" 
                                  style={{ 
                                    backgroundColor: darkMode 
                                      ? DARK_COLORS[(index + 4) % DARK_COLORS.length] 
                                      : LIGHT_COLORS[(index + 4) % LIGHT_COLORS.length] 
                                  }}
                                ></div>
                                {item.name}
                              </div>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-right`}>{item.value}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-right`}>{item.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg flex items-center justify-center h-20`}>
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>No age data available for this product</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {availableQuestions.length > 0 && (
        <div className={`mb-6 p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg`}>
          <label htmlFor="question-select" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Select Question:</label>
          
          {/* Enhanced dropdown with proper dark mode styling */}
          <select 
            id="question-select" 
            value={selectedQuestionNumber} 
            onChange={handleQuestionChange}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500' 
                : 'border-gray-300 bg-white text-gray-900 focus:ring-pink-500 focus:border-pink-500'
            } sm:text-sm rounded-md`}
            style={{
              boxShadow: darkMode ? 'none' : undefined
            }}
          >
            {/* Add dark mode styling to option elements */}
            <option value="" className={darkMode ? 'bg-gray-700 text-white' : ''}>Select a question</option>
            {questions.map(q => (
              <option 
                key={q.number} 
                value={q.number}
                className={darkMode ? 'bg-gray-700 text-white' : ''}
              >
                {q.text.length > 70 ? q.text.substring(0, 70) + "..." : q.text}
              </option>
            ))}
          </select>
          
          {questionText && (
            <div className={`mt-3 p-3 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} rounded border`}>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <span className="font-medium">Question:</span> {questionText}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Response Analysis */}
      {selectedQuestionNumber && (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg shadow mb-6`}>
          <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : ''}`}>Response Analysis for Question {parseInt(selectedQuestionNumber)}</h3>
          <p className={`mb-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Select one or more responses to see demographic breakdowns</p>
          
          {responseData.length > 0 ? (
            <div className="overflow-hidden">
              <div className="mb-6">
                <div className="overflow-x-auto max-h-96">
                  <div className="grid grid-cols-1 gap-2">
                    {responseData.map((item, index) => (
                      <div 
                        key={index} 
                        onClick={() => handleResponseClick(item)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedResponses.some(r => r.fullResponse === item.fullResponse)
                            ? darkMode 
                              ? 'bg-pink-900 border-pink-700' 
                              : 'bg-pink-50 border-pink-300'
                            : darkMode
                              ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-3" 
                              style={{ 
                                backgroundColor: darkMode 
                                  ? DARK_COLORS[index % DARK_COLORS.length] 
                                  : LIGHT_COLORS[index % LIGHT_COLORS.length] 
                              }}
                            ></div>
                            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {item.fullResponse}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {item.count}
                            </span>
                            <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {item.percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Response Breakdowns */}
              {selectedResponses.length > 0 && (
                <div className={`mt-8 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-6`}>
                  <h4 className={`text-lg font-medium mb-4 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}>
                    {selectedResponses.length === 1 
                      ? `Breakdown for "${selectedResponses[0].fullResponse}"` 
                      : `Breakdown for ${selectedResponses.length} selected responses`}
                  </h4>
                  
                  {/* Gender Breakdown */}
                  {responseByGender.length > 0 && (
                    <div className="mt-6">
                      <h5 className={`text-md font-medium mb-3 ${darkMode ? 'text-gray-300' : ''}`}>Gender Breakdown</h5>
                      
                      {/* Gender Breakdown - Chart and Table side by side */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={responseByGender}
                              margin={{ top: 20, right: 30, left: 30, bottom: 40 }}
                              barCategoryGap="20%"
                            >
                              <CartesianGrid 
                                strokeDasharray="3 3" 
                                stroke={darkMode ? '#374151' : '#e5e7eb'}
                                strokeOpacity={0.6}
                              />
                              <XAxis 
                                dataKey="name" 
                                tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 12 }}
                                axisLine={{ stroke: darkMode ? '#6b7280' : '#374151', strokeWidth: 1 }}
                                tickLine={{ stroke: darkMode ? '#6b7280' : '#374151' }}
                              />
                              <YAxis 
                                tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 12 }}
                                axisLine={{ stroke: darkMode ? '#6b7280' : '#374151', strokeWidth: 1 }}
                                tickLine={{ stroke: darkMode ? '#6b7280' : '#374151' }}
                                label={{ 
                                  value: 'Count', 
                                  angle: -90, 
                                  position: 'insideLeft',
                                  style: { textAnchor: 'middle', fill: darkMode ? '#d1d5db' : '#374151' }
                                }}
                              />
                              <Tooltip 
                                content={({ active, payload, label }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} p-4 border shadow-lg rounded-lg`}>
                                        <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{label}</p>
                                        <p className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                                          👥 {payload[0].value} respondents
                                        </p>
                                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                                          {((payload[0].value / payload[0].payload.total) * 100).toFixed(1)}% of total
                                        </p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="value" name="Count">
                                {responseByGender.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={darkMode ? DARK_COLORS[index % DARK_COLORS.length] : LIGHT_COLORS[index % LIGHT_COLORS.length]}
                                    radius={[4, 4, 0, 0]}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        
                        {/* Gender Table */}
                        <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                          <div className="overflow-x-auto">
                            <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                              <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                                <tr>
                                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Gender</th>
                                  <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Count</th>
                                  <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Percentage</th>
                                </tr>
                              </thead>
                              <tbody className={`${darkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
                                {responseByGender.map((item, index) => {
                                  const total = responseByGender.reduce((sum, i) => sum + i.value, 0);
                                  const percentage = total > 0 ? (item.value / total * 100).toFixed(1) : "0.0";
                                  
                                  return (
                                    <tr key={index}>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                        <div className="flex items-center">
                                          <div 
                                            className="h-3 w-3 rounded-full mr-2" 
                                            style={{ 
                                              backgroundColor: darkMode 
                                                ? DARK_COLORS[index % DARK_COLORS.length] 
                                                : LIGHT_COLORS[index % LIGHT_COLORS.length] 
                                            }}
                                          ></div>
                                          {item.name}
                                        </div>
                                      </td>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-right`}>{item.value}</td>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-right`}>{percentage}%</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Age Breakdown */}
                  <div className="mt-6">
                    <h5 className={`text-md font-medium mb-3 ${darkMode ? 'text-gray-300' : ''}`}>Age Breakdown</h5>
                    {responseByAge.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Age Bar Chart - Direct implementation with dark mode */}
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={responseByAge}
                              margin={{ top: 20, right: 30, left: 30, bottom: 40 }}
                              barCategoryGap="15%"
                            >
                              <CartesianGrid 
                                strokeDasharray="3 3" 
                                stroke={darkMode ? '#374151' : '#e5e7eb'}
                                strokeOpacity={0.6}
                              />
                              <XAxis 
                                dataKey="name" 
                                tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 11 }}
                                axisLine={{ stroke: darkMode ? '#6b7280' : '#374151', strokeWidth: 1 }}
                                tickLine={{ stroke: darkMode ? '#6b7280' : '#374151' }}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                              />
                              <YAxis 
                                tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 12 }}
                                axisLine={{ stroke: darkMode ? '#6b7280' : '#374151', strokeWidth: 1 }}
                                tickLine={{ stroke: darkMode ? '#6b7280' : '#374151' }}
                                label={{ 
                                  value: 'Count', 
                                  angle: -90, 
                                  position: 'insideLeft',
                                  style: { textAnchor: 'middle', fill: darkMode ? '#d1d5db' : '#374151' }
                                }}
                              />
                              <Tooltip 
                                content={({ active, payload, label }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} p-4 border shadow-lg rounded-lg`}>
                                        <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{label}</p>
                                        <p className={`text-sm ${darkMode ? 'text-purple-400' : 'text-purple-600'} font-medium`}>
                                          🎂 {payload[0].value} respondents
                                        </p>
                                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                                          {((payload[0].value / payload[0].payload.total) * 100).toFixed(1)}% of total
                                        </p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="value" name="Count">
                                {responseByAge.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={darkMode ? DARK_COLORS[(index + 4) % DARK_COLORS.length] : LIGHT_COLORS[(index + 4) % LIGHT_COLORS.length]}
                                    radius={[4, 4, 0, 0]}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        
                        {/* Age Table */}
                        <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                          <div className="overflow-x-auto">
                            <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                              <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                                <tr>
                                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Age Group</th>
                                  <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Count</th>
                                  <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Percentage</th>
                                </tr>
                              </thead>
                              <tbody className={`${darkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
                                {responseByAge.map((item, index) => {
                                  const total = responseByAge.reduce((sum, i) => sum + i.value, 0);
                                  const percentage = total > 0 ? (item.value / total * 100).toFixed(1) : "0.0";
                                  
                                  return (
                                    <tr key={index}>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                        <div className="flex items-center">
                                          <div 
                                            className="h-3 w-3 rounded-full mr-2" 
                                            style={{ 
                                              backgroundColor: darkMode 
                                                ? DARK_COLORS[(index + 4) % DARK_COLORS.length] 
                                                : LIGHT_COLORS[(index + 4) % LIGHT_COLORS.length] 
                                            }}
                                          ></div>
                                          {item.name}
                                        </div>
                                      </td>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-right`}>{item.value}</td>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-right`}>{percentage}%</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg flex items-center justify-center h-20`}>
                        <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                          {selectedResponses.length > 0 
                            ? isProcessingDemographics ? "Loading age data..." : "No age data available"
                            : "Select a response to view age breakdown"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`flex items-center justify-center h-60 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded`}>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>No response data available for this question</p>
            </div>
          )}
        </div>
      )}
      
      {/* Explanation text at the bottom */}
      {selectedResponses.length > 0 && (
        <div className={`${darkMode ? 'bg-blue-900 border-blue-800' : 'bg-blue-50 border-blue-200'} p-4 rounded-lg shadow mt-4 border`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>How to interpret this data</h3>
              <div className={`mt-2 text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                <p>
                  The demographic breakdowns show the distribution of genders and age groups among respondents who
                  selected the highlighted response(s).
                </p>
                <p className="mt-1">
                  You can select multiple responses to compare demographic distributions across different answers.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemographicsTab;