import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useTheme } from '../../../context/ThemeContext'; // Added ThemeContext import
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart,
  Pie, Cell, BarChart, Bar, Area, ComposedChart
} from 'recharts';
import { useClientData } from '../../../context/ClientDataContext';
import groupBy from 'lodash/groupBy';

// Custom colors for light and dark mode
const LIGHT_COLORS = ['#FF0066', '#0066CC', '#FFC107', '#00ACC1', '#9C27B0', '#4CAF50', '#FF9800'];
const DARK_COLORS = ['#FF4D94', '#4D94FF', '#FFD54F', '#4DD0E1', '#CE93D8', '#81C784', '#FFB74D'];

const DEFAULT_PAGE_SIZE = 10;

const OffersTab = ({ isSharedView }) => {
  // Get dark mode from ThemeContext
  const { darkMode } = useTheme();

  const clientData = useClientData();
  const dataContext = useData();
  const { 
    offerData: contextOfferData,
    hasOfferData: contextHasOfferData,
    filteredData: directFilteredData
  } = isSharedView ? clientData : dataContext;

  const offerData = isSharedView ? (contextOfferData || directFilteredData) : contextOfferData;
  const hasOfferData = isSharedView ? (offerData && offerData.length > 0) : contextHasOfferData;
  
  console.log("OffersTab data:", {
    isSharedView,
    hasOfferData,
    offerDataLength: offerData?.length
  });

  // Local state
  const [selectedOffers, setSelectedOffers] = useState(['all']);
  const [insightType, setInsightType] = useState('metrics');
  const [excludeFirstDays, setExcludeFirstDays] = useState(false); // Disabled by default to debug
  const [excludeLastDays, setExcludeLastDays] = useState(false);   // Disabled by default to debug
  const [excludeDaysCount, setExcludeDaysCount] = useState(7);
  const [excludeLastDaysCount, setExcludeLastDaysCount] = useState(3);
  const [customExcludedDates, setCustomExcludedDates] = useState([]);
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [chartType, setChartType] = useState('line');
  const [showDataPoints, setShowDataPoints] = useState(true);
  const [smoothLine, setSmoothLine] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState('');
  
  // Preprocessing state
  const [processedData, setProcessedData] = useState({
    byOffer: {},
    byDate: {},
    byGender: {},
    byAgeGroup: {},
    byRank: {},
    uniqueOffers: [],
    uniqueDates: [],
    availableMonths: []
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Debug offer data to examine date format
  useEffect(() => {
    if (offerData && offerData.length > 0) {
      for (let i = 0; i < Math.min(5, offerData.length); i++) {
        console.log(`Item ${i+1}:`, offerData[i]);
        console.log(`  created_at:`, offerData[i].created_at);
        
        // Try to parse the date
        try {
          const date = new Date(offerData[i].created_at);
          console.log(`  parsed date:`, date);
          console.log(`  is valid:`, !isNaN(date.getTime()));
          console.log(`  ISO string:`, date.toISOString());
          console.log(`  date string:`, date.toISOString().split('T')[0]);
        } catch (e) {
          console.error(`  parsing error:`, e);
        }
      }
    }
  }, [offerData]);

  // Preprocess data when it changes
  useEffect(() => {
    if (!offerData || offerData.length === 0) return;

    try {
      const datesWithHits = [];
      const months = new Set();
      const byOffer = {};
      const byDate = {};
      const byGender = {};
      const byAgeGroup = {};
      const byRank = {};
      const uniqueOffers = new Set();
      const uniqueDates = new Set();
      let validDates = 0;

      offerData.forEach(item => {
        if (item.offer_name) {
          uniqueOffers.add(item.offer_name);
          byOffer[item.offer_name] = byOffer[item.offer_name] || [];
          byOffer[item.offer_name].push(item);
        }
        if (item.created_at) {
          try {
            const date = new Date(item.created_at);
            if (!isNaN(date.getTime())) {
              validDates++;
              const dateStr = date.toISOString().split('T')[0];
              const monthStr = dateStr.substring(0, 7);
              uniqueDates.add(dateStr);
              months.add(monthStr);
              datesWithHits.push(dateStr);
              byDate[dateStr] = byDate[dateStr] || [];
              byDate[dateStr].push(item);
            }
          } catch (e) {
            // skip invalid date
          }
        }
        if (item.gender) {
          byGender[item.gender] = byGender[item.gender] || [];
          byGender[item.gender].push(item);
        }
        if (item.age_group) {
          byAgeGroup[item.age_group] = byAgeGroup[item.age_group] || [];
          byAgeGroup[item.age_group].push(item);
        }
        if (item.rank_for_viewer != null) {
          const rank = item.rank_for_viewer.toString();
          byRank[rank] = byRank[rank] || [];
          byRank[rank].push(item);
        }
      });

      console.log("Valid dates found:", validDates);
      console.log("Unique dates:", uniqueDates.size);
      console.log("Date buckets created:", Object.keys(byDate).length);

      if (datesWithHits.length > 0) {
        const sortedDates = [...datesWithHits].sort();
        setStartDate(sortedDates[0]);
        setEndDate(sortedDates[sortedDates.length - 1]);

        const sortedMonths = [...months].sort();
        if (sortedMonths.length > 0) {
          setSelectedMonth(sortedMonths[sortedMonths.length - 1]);
        }
      }

      setProcessedData({
        byOffer,
        byDate,
        byGender,
        byAgeGroup,
        byRank,
        uniqueOffers: [...uniqueOffers].sort(),
        uniqueDates: [...uniqueDates].sort(),
        availableMonths: [...months].sort()
      });
    } catch (err) {
      console.error('Error during data preprocessing:', err);
    }
  }, [offerData]);

  // Handle offer selection
  const handleOfferSelection = (offer) => {
    if (offer === 'all') {
      setSelectedOffers(['all']);
    } else {
      const newSelection = selectedOffers.includes('all')
        ? [offer]
        : selectedOffers.includes(offer)
          ? selectedOffers.filter(o => o !== offer)
          : [...selectedOffers, offer];
      setSelectedOffers(newSelection.length ? newSelection : ['all']);
    }
  };

  // Get filtered offer data
  const filteredOfferData = useMemo(() => {
    if (!offerData || !offerData.length) return [];

    const isAllOffers = selectedOffers.includes('all');
    let result = [];

    if (!isAllOffers && processedData.byOffer) {
      selectedOffers.forEach(offer => {
        if (processedData.byOffer[offer]) {
          result = [...result, ...processedData.byOffer[offer]];
        }
      });
    } else {
      result = [...offerData];
    }

    if (dateRange !== 'all' && processedData.byDate) {
      const filteredByDate = [];
      if (dateRange === 'month' && selectedMonth) {
        Object.entries(processedData.byDate).forEach(([date, items]) => {
          if (date.startsWith(selectedMonth)) {
            filteredByDate.push(...items);
          }
        });
        if (result.length > 0) {
          const dateItemIds = new Set(filteredByDate.map(item => item.hit_id));
          result = result.filter(item => dateItemIds.has(item.hit_id));
        } else {
          result = filteredByDate;
        }
      } else if (dateRange === 'custom' && startDate && endDate) {
        Object.entries(processedData.byDate).forEach(([date, items]) => {
          if (date >= startDate && date <= endDate) {
            filteredByDate.push(...items);
          }
        });
        if (result.length > 0) {
          const dateItemIds = new Set(filteredByDate.map(item => item.hit_id));
          result = result.filter(item => dateItemIds.has(item.hit_id));
        } else {
          result = filteredByDate;
        }
      }
    }

    return result;
  }, [offerData, selectedOffers, dateRange, startDate, endDate, selectedMonth, processedData]);

  // Apply exclusion rules for first/last days and custom excluded dates
  const exclusionAdjustedData = useMemo(() => {
    console.log("Applying exclusions to filtered data:", filteredOfferData.length);
    
    if (!filteredOfferData.length || 
        (!excludeFirstDays && 
         !excludeLastDays && 
         (!customExcludedDates || customExcludedDates.length === 0))) {
      return filteredOfferData;
    }
    
    try {
      const offerGroups = groupBy(filteredOfferData, 'offer_name');
      let adjustedData = [];
      
      Object.entries(offerGroups).forEach(([offerName, offerItems]) => {
        if (!offerItems.length || !offerName) return;
        
        const itemsByDate = groupBy(offerItems, item => {
          try {
            // Check if created_at exists and is valid
            if (!item.created_at) {
              return null;
            }
            
            // Parse the date string
            const date = new Date(item.created_at);
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
              return null;
            }
            
            return date.toISOString().split('T')[0];
          } catch (e) {
            console.error("Error processing date:", e, item);
            return null;
          }
        });
        
        delete itemsByDate['null'];
        
        const sortedDates = Object.keys(itemsByDate).sort();
        console.log(`Offer ${offerName}: ${sortedDates.length} unique dates`);
        
        const excludeDates = new Set(customExcludedDates);
        
        if (excludeFirstDays && sortedDates.length > excludeDaysCount) {
          sortedDates.slice(0, excludeDaysCount).forEach(date => excludeDates.add(date));
        }
        
        if (excludeLastDays && sortedDates.length > excludeLastDaysCount) {
          sortedDates.slice(-excludeLastDaysCount).forEach(date => excludeDates.add(date));
        }
        
        if (excludeDates.size > 0) {
          console.log(`Excluding ${excludeDates.size} dates from offer ${offerName}`);
          sortedDates.forEach(date => {
            if (!excludeDates.has(date)) {
              adjustedData = [...adjustedData, ...itemsByDate[date]];
            }
          });
        } else {
          adjustedData = [...adjustedData, ...offerItems];
        }
      });
      
      console.log("After exclusions, data items:", adjustedData.length);
      return adjustedData;
    } catch (err) {
      console.error('Error applying exclusions:', err);
      return filteredOfferData;
    }
  }, [filteredOfferData, excludeFirstDays, excludeLastDays, excludeDaysCount, excludeLastDaysCount, customExcludedDates]);
  
  // Gender distribution
  const genderData = useMemo(() => {
    const adjustedData = exclusionAdjustedData;
    if (!adjustedData.length) return [];
    try {
      const genderGroups = groupBy(adjustedData.filter(item => item.gender), 'gender');
      return Object.entries(genderGroups).map(([gender, items]) => ({
        name: gender,
        value: items.length,
        percentage: (items.length / adjustedData.length) * 100
      })).sort((a, b) => b.value - a.value);
    } catch (err) {
      console.error('Error calculating gender data:', err);
      return [];
    }
  }, [exclusionAdjustedData]);

  // Age group distribution
  const ageData = useMemo(() => {
    const adjustedData = exclusionAdjustedData;
    if (!adjustedData.length) return [];
    try {
      const ageGroups = groupBy(adjustedData.filter(item => item.age_group), 'age_group');
      return Object.entries(ageGroups).map(([ageGroup, items]) => ({
        name: ageGroup,
        value: items.length,
        percentage: (items.length / adjustedData.length) * 100
      })).sort((a, b) => b.value - a.value);
    } catch (err) {
      console.error('Error calculating age data:', err);
      return [];
    }
  }, [exclusionAdjustedData]);

  // Rank distribution
  const rankData = useMemo(() => {
    if (!exclusionAdjustedData.length) return [];
    try {
      const rankGroups = groupBy(
        exclusionAdjustedData.filter(item => item.rank_for_viewer != null),
        'rank_for_viewer'
      );
      return Object.entries(rankGroups)
        .map(([rank, items]) => ({
          name: rank,
          value: items.length,
          percentage: (items.length / exclusionAdjustedData.length) * 100
        }))
        .sort((a, b) => parseInt(a.name) - parseInt(b.name));
    } catch (err) {
      console.error('Error calculating rank data:', err);
      return [];
    }
  }, [exclusionAdjustedData]);

  // Offer distribution
  const offerDistribution = useMemo(() => {
    if (!exclusionAdjustedData.length) return [];
    try {
      const offerGroups = groupBy(exclusionAdjustedData, 'offer_name');
      return Object.entries(offerGroups)
        .map(([offerName, items]) => ({
          name: offerName || 'Unknown',
          value: items.length,
          percentage: (items.length / exclusionAdjustedData.length) * 100
        }))
        .sort((a, b) => b.value - a.value);
    } catch (err) {
      console.error('Error calculating offer distribution:', err);
      return [];
    }
  }, [exclusionAdjustedData]);

  // Time distribution
  const { hourData, dayData, trendData } = useMemo(() => {
    console.log("exclusionAdjustedData length:", exclusionAdjustedData.length);
    
    if (!exclusionAdjustedData.length) {
      return { hourData: [], dayData: [], trendData: [] };
    }
    
    try {
      // Filter out items with created_at
      const dataWithDates = exclusionAdjustedData
        .filter(item => item.created_at);
      
      console.log("Items with created_at:", dataWithDates.length);
      
      if (dataWithDates.length === 0) {
        return { hourData: [], dayData: [], trendData: [] };
      }
      
      // Map and extract hour, day, and date info
      const mappedData = dataWithDates.map(item => {
        try {
          const date = new Date(item.created_at);
          if (isNaN(date.getTime())) {
            console.log("Invalid date:", item.created_at);
            return null;
          }
          
          return {
            hour: date.getHours(),
            day: date.getDay(),
            date: date.toISOString().split('T')[0],
            dateObj: date
          };
        } catch (e) {
          console.error("Error parsing date:", e);
          return null;
        }
      }).filter(Boolean);
      
      console.log("Valid parsed dates:", mappedData.length);

      // Hour distribution
      const hourGroups = groupBy(mappedData, 'hour');
      const hourData = Array.from({ length: 24 }, (_, i) => ({
        name: i.toString(),
        value: hourGroups[i] ? hourGroups[i].length : 0
      }));

      // Day distribution
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayGroups = groupBy(mappedData, 'day');
      const dayData = Array.from({ length: 7 }, (_, i) => ({
        name: dayNames[i],
        value: dayGroups[i] ? dayGroups[i].length : 0
      }));

      // Time trend
      const hitsByDate = groupBy(mappedData, 'date');
      console.log("Dates with hits:", Object.keys(hitsByDate).length);
      
      const trendData = Object.keys(hitsByDate).length > 0 
        ? Object.entries(hitsByDate)
            .map(([date, items]) => ({ 
              date, 
              formattedDate: formatDate(date),
              count: items.length 
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
        : [];
      
      console.log("Final trend data points:", trendData.length);
      if (trendData.length > 0) {
        console.log("First point:", trendData[0]);
        console.log("Last point:", trendData[trendData.length - 1]);
      }

      return { hourData, dayData, trendData };
    } catch (err) {
      console.error('Error calculating time distribution:', err);
      return { hourData: [], dayData: [], trendData: [] };
    }
  }, [exclusionAdjustedData]);

  // Debug trend data
  useEffect(() => {
    console.log("Trend data for chart:", trendData);
    console.log("Is data empty?", trendData.length === 0);
    if (trendData.length > 0) {
      console.log("Sample point:", trendData[0]);
    }
  }, [trendData]);

  // Metrics
  const metrics = useMemo(() => {
    if (!exclusionAdjustedData.length) {
      return {
        totalHits: 0,
        averageHitsPerDay: 0,
        periodDays: 0,
        hitsPerOffer: {}
      };
    }
    try {
      const hitsByDate = groupBy(exclusionAdjustedData, item => {
        try {
          const date = new Date(item.created_at);
          return date.toISOString().split('T')[0];
        } catch (e) {
          return null;
        }
      });
      delete hitsByDate['null'];
      const totalHits = exclusionAdjustedData.length;
      const uniqueDates = Object.keys(hitsByDate);
      const periodDays = uniqueDates.length;
      const averageHitsPerDay = periodDays > 0 ? (totalHits / periodDays).toFixed(2) : 0;
      const hitsPerOffer = {};
      if (!selectedOffers.includes('all')) {
        const offerGroups = groupBy(exclusionAdjustedData, 'offer_name');
        selectedOffers.forEach(offer => {
          const offerItems = offerGroups[offer] || [];
          const offerHitsByDate = groupBy(offerItems, item => {
            try {
              const date = new Date(item.created_at);
              return date.toISOString().split('T')[0];
            } catch (e) {
              return null;
            }
          });
          delete offerHitsByDate['null'];
          const offerDays = Object.keys(offerHitsByDate).length;
          hitsPerOffer[offer] = {
            totalHits: offerItems.length,
            days: offerDays,
            averagePerDay: offerDays > 0 ? (offerItems.length / offerDays).toFixed(2) : 0
          };
        });
      }
      return {
        totalHits,
        periodDays,
        averageHitsPerDay,
        hitsPerOffer
      };
    } catch (err) {
      console.error('Error calculating metrics:', err);
      return {
        totalHits: 0,
        averageHitsPerDay: 0,
        periodDays: 0,
        hitsPerOffer: {}
      };
    }
  }, [exclusionAdjustedData, selectedOffers]);

  // Pagination helper and controls
  const getPaginatedData = (dataArray) => {
    const startIndex = (currentPage - 1) * pageSize;
    return dataArray.slice(startIndex, startIndex + pageSize);
  };

  const renderPagination = (totalItems) => {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between mt-4">
        <div>
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
            Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-md ${
              currentPage === 1 
                ? `${darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'} cursor-not-allowed` 
                : `${darkMode ? 'bg-pink-900 text-pink-300 hover:bg-pink-800' : 'bg-pink-50 text-pink-600 hover:bg-pink-100'}`
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-md ${
              currentPage === totalPages 
                ? `${darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'} cursor-not-allowed` 
                : `${darkMode ? 'bg-pink-900 text-pink-300 hover:bg-pink-800' : 'bg-pink-50 text-pink-600 hover:bg-pink-100'}`
            }`}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  // Handle custom date exclusion
  const handleAddExcludedDate = () => {
    if (datePickerValue && !customExcludedDates.includes(datePickerValue)) {
      setCustomExcludedDates([...customExcludedDates, datePickerValue]);
      setDatePickerValue('');
    }
  };

  const handleRemoveExcludedDate = (date) => {
    setCustomExcludedDates(customExcludedDates.filter(d => d !== date));
  };

  // Reset pagination when changing insight type
  useEffect(() => {
    setCurrentPage(1);
  }, [insightType]);

  // Custom tooltip with dark mode support
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-2 shadow-md rounded-md border`}>
          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // If no data available, show a message
  if (!offerData || offerData.length === 0) {
    return (
      <div className={`flex justify-center items-center h-64 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="text-center">
          <svg className={`mx-auto h-12 w-12 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className={`mt-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>No offer data available</h3>
          <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Upload a file with offer data to see insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
      {/* Title and controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 sm:mb-0`}>Offer Insights</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <select 
              value={insightType}
              onChange={(e) => setInsightType(e.target.value)}
              className={`px-3 py-2 border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500' 
                  : 'border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500'
              } rounded-md text-sm focus:outline-none`}
            >
              <option value="metrics">Overview</option>
              <option value="offers">Offer Distribution</option>
              <option value="demographics">Demographics</option>
              <option value="time">Time Analysis</option>
              <option value="ranking">Ranking Analysis</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className={`flex items-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                checked={chartType === 'line'}
                onChange={() => setChartType(chartType === 'line' ? 'bar' : 'line')}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <span className="ml-2">Line Chart</span>
            </label>
            {chartType === 'line' && (
              <>
                <label className={`flex items-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <input
                    type="checkbox"
                    checked={showDataPoints}
                    onChange={() => setShowDataPoints(!showDataPoints)}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                  />
                  <span className="ml-2">Show Points</span>
                </label>
                <label className={`flex items-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <input
                    type="checkbox"
                    checked={smoothLine}
                    onChange={() => setSmoothLine(!smoothLine)}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                  />
                  <span className="ml-2">Smooth Line</span>
                </label>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Offer selection */}
      <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg mb-6`}>
        <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Filter by Offer</h3>
        <div className="flex flex-wrap gap-2 mt-2 max-h-40 overflow-y-auto">
          <button
            onClick={() => handleOfferSelection('all')}
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
              selectedOffers.includes('all')
                ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-700'
                : `${darkMode ? 'bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500' : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'}`
            }`}
          >
            <span>All Offers</span>
          </button>
          
          {processedData.uniqueOffers.map(offer => (
            <button
              key={offer}
              onClick={() => handleOfferSelection(offer)}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                selectedOffers.includes(offer) && !selectedOffers.includes('all')
                  ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-700'
                  : `${darkMode ? 'bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500' : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'}`
              }`}
            >
              <span>{offer.length > 20 ? offer.substring(0, 20) + '...' : offer}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date controls */}
      <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg mb-6`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column - Date range */}
          <div>
            <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Date Range</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => setDateRange('all')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    dateRange === 'all'
                      ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-700'
                      : `${darkMode ? 'bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500' : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'}`
                  }`}
                >
                  All Dates
                </button>
                <button
                  onClick={() => setDateRange('month')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    dateRange === 'month'
                      ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-700'
                      : `${darkMode ? 'bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500' : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'}`
                  }`}
                >
                  By Month
                </button>
                <button
                  onClick={() => setDateRange('custom')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    dateRange === 'custom'
                      ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-700'
                      : `${darkMode ? 'bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500' : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'}`
                  }`}
                >
                  Custom
                </button>
              </div>

              {dateRange === 'month' && (
                <div className="flex-grow">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className={`w-full px-3 py-2 border ${
                      darkMode 
                        ? 'bg-gray-600 border-gray-500 text-white focus:ring-pink-500 focus:border-pink-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500'
                    } rounded-md text-sm focus:outline-none`}
                  >
                    <option value="">Select Month</option>
                    {processedData.availableMonths.map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
              )}

              {dateRange === 'custom' && (
                <div className="flex items-center space-x-2 flex-grow">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`flex-1 px-3 py-2 border ${
                      darkMode 
                        ? 'bg-gray-600 border-gray-500 text-white focus:ring-pink-500 focus:border-pink-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500'
                    } rounded-md text-sm focus:outline-none`}
                  />
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`flex-1 px-3 py-2 border ${
                      darkMode 
                        ? 'bg-gray-600 border-gray-500 text-white focus:ring-pink-500 focus:border-pink-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500'
                    } rounded-md text-sm focus:outline-none`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right column - Exclusion settings */}
          <div>
            <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Date Exclusions</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={excludeFirstDays}
                    onChange={() => setExcludeFirstDays(!excludeFirstDays)}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                  />
                  <span className={`ml-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Exclude first</span>
                  <input 
                    type="number" 
                    min="0"
                    max="30"
                    value={excludeDaysCount}
                    onChange={(e) => setExcludeDaysCount(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={!excludeFirstDays}
                    className={`ml-2 w-14 px-2 py-1 border ${
                      darkMode 
                        ? 'bg-gray-600 border-gray-500 text-white focus:ring-pink-500 focus:border-pink-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500'
                    } rounded-md text-sm focus:outline-none disabled:opacity-50`}
                  />
                  <span className={`ml-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>days</span>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={excludeLastDays}
                    onChange={() => setExcludeLastDays(!excludeLastDays)}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                  />
                  <span className={`ml-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Exclude last</span>
                  <input 
                    type="number" 
                    min="0"
                    max="30"
                    value={excludeLastDaysCount}
                    onChange={(e) => setExcludeLastDaysCount(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={!excludeLastDays}
                    className={`ml-2 w-14 px-2 py-1 border ${
                      darkMode 
                        ? 'bg-gray-600 border-gray-500 text-white focus:ring-pink-500 focus:border-pink-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500'
                    } rounded-md text-sm focus:outline-none disabled:opacity-50`}
                  />
                  <span className={`ml-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>days</span>
                </div>
              </div>
              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="date"
                    value={datePickerValue}
                    onChange={(e) => setDatePickerValue(e.target.value)}
                    className={`w-full px-2 py-1 border ${
                      darkMode 
                        ? 'bg-gray-600 border-gray-500 text-white focus:ring-pink-500 focus:border-pink-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500'
                    } rounded-md text-sm focus:outline-none`}
                  />
                  <button
                    onClick={handleAddExcludedDate}
                    disabled={!datePickerValue}
                    className={`ml-2 px-2 py-1 ${
                      !datePickerValue
                        ? `${darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`
                        : `${darkMode ? 'bg-pink-900 text-pink-300 hover:bg-pink-800' : 'bg-pink-100 text-pink-800 hover:bg-pink-200'}`
                    } rounded-md text-sm`}
                  >
                    Add
                  </button>
                </div>
                <div className="max-h-20 overflow-y-auto">
                  {customExcludedDates.length > 0 ? (
                    <ul className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {customExcludedDates.map(date => (
                        <li key={date} className="flex justify-between items-center py-1">
                          <span>{formatDate(date)}</span>
                          <button
                            onClick={() => handleRemoveExcludedDate(date)}
                            className={`${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No custom excluded dates</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content based on insight type */}
      {insightType === 'metrics' && (
        <div>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} p-4 border rounded-lg shadow-sm`}>
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${darkMode ? 'bg-pink-900/30 text-pink-400' : 'bg-pink-100 text-pink-600'} mr-4`}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Hits</p>
                  <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{metrics.totalHits.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} p-4 border rounded-lg shadow-sm`}>
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'} mr-4`}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Period Length</p>
                  <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{metrics.periodDays} days</p>
                </div>
              </div>
            </div>
            <div className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} p-4 border rounded-lg shadow-sm`}>
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600'} mr-4`}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Average Hits/Day</p>
                  <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{metrics.averageHitsPerDay}</p>
                </div>
              </div>
            </div>
            <div className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} p-4 border rounded-lg shadow-sm`}>
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600'} mr-4`}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Date Range</p>
                  <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {processedData.uniqueDates.length > 0 ? 
                      `${formatDate(processedData.uniqueDates[0])} - ${formatDate(processedData.uniqueDates[processedData.uniqueDates.length-1])}` : 
                      "No dates available"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Offer Hits Over Time Chart */}
          <div className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} p-4 border rounded-lg shadow-sm mb-6`}>
            <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Offer Hits Over Time</h3>
            {trendData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                    <LineChart
                      data={trendData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#4B5563' : '#E5E7EB'} />
                      <XAxis 
                        dataKey="formattedDate" 
                        angle={-45} 
                        textAnchor="end"
                        height={80}
                        interval={Math.max(0, Math.floor(trendData.length / 15))}
                        tick={{ fill: darkMode ? '#E5E7EB' : '#4B5563' }}
                      />
                      <YAxis tick={{ fill: darkMode ? '#E5E7EB' : '#4B5563' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: darkMode ? '#E5E7EB' : '#4B5563' }} />
                      <Line 
                        type={smoothLine ? "monotone" : "linear"} 
                        dataKey="count" 
                        name="Hits" 
                        stroke={darkMode ? '#FF4D94' : '#FF0066'} 
                        strokeWidth={2}
                        dot={showDataPoints ? { stroke: darkMode ? '#FF4D94' : '#FF0066', strokeWidth: 2, r: 3, fill: darkMode ? '#1F2937' : 'white' } : false}
                        activeDot={{ stroke: darkMode ? '#FF4D94' : '#FF0066', strokeWidth: 2, r: 5, fill: darkMode ? '#1F2937' : 'white' }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart
                      data={trendData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#4B5563' : '#E5E7EB'} />
                      <XAxis 
                        dataKey="formattedDate" 
                        angle={-45} 
                        textAnchor="end"
                        height={80}
                        interval={Math.max(0, Math.floor(trendData.length / 15))}
                        tick={{ fill: darkMode ? '#E5E7EB' : '#4B5563' }}
                      />
                      <YAxis tick={{ fill: darkMode ? '#E5E7EB' : '#4B5563' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: darkMode ? '#E5E7EB' : '#4B5563' }} />
                      <Bar dataKey="count" name="Hits" fill={darkMode ? '#FF4D94' : '#FF0066'} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : (
              <div className={`flex justify-center items-center h-64 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded`}>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>No time series data available. Try adjusting your filters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Other insight type sections would go here, all with dark mode styling */}
    </div>
  );
};

export default OffersTab;