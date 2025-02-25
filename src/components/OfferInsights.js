import React, { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import _ from 'lodash';

// Generate colors for charts - Shopmium branded colors with better contrast
const COLORS = ['#FF0066', '#0066CC', '#FFC107', '#00ACC1', '#9C27B0', '#4CAF50', '#FF9800'];

// Default page size for tables
const DEFAULT_PAGE_SIZE = 10;

const OfferInsights = forwardRef(({ data }, ref) => {
    
  const [selectedOffers, setSelectedOffers] = useState(['all']);
  const [insightType, setInsightType] = useState('demographic');
  const [excludeFirstDays, setExcludeFirstDays] = useState(true);
  const [excludeLastDays, setExcludeLastDays] = useState(true);
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  
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

  useImperativeHandle(ref, () => ({
    getVisibleData: () => {
      return {
        insightType,
        metrics,
        offerData,
        genderData: demographicData.genderData,
        ageData: demographicData.ageData,
        timeData: {
          hourData: timeDistribution.hourData,
          dayData: timeDistribution.dayData,
          trendData: timeDistribution.trendData
        },
        rankData,
        selectedOffers,
        excludeFirstDays,
        excludeLastDays
      };
    }
  }));
  
  // Preprocess data when it changes (run once on component mount)
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    // Start preprocessing
    console.time('Data Preprocessing');
    
    try {
      // Extract and preprocess dates
      const datesWithHits = [];
      const months = new Set();
      
      // Create efficient data structures for lookups
      const byOffer = {};
      const byDate = {};
      const byGender = {};
      const byAgeGroup = {};
      const byRank = {};
      
      // Build unique sets for quick lookups
      const uniqueOffers = new Set();
      const uniqueDates = new Set();
      
      // Scan data once and build all required indexes
      data.forEach(item => {
        // Handle offers
        if (item.offer_name) {
          uniqueOffers.add(item.offer_name);
          byOffer[item.offer_name] = byOffer[item.offer_name] || [];
          byOffer[item.offer_name].push(item);
        }
        
        // Handle dates
        if (item.created_at) {
          try {
            const date = new Date(item.created_at);
            const dateStr = date.toISOString().split('T')[0];
            const monthStr = dateStr.substring(0, 7);
            
            uniqueDates.add(dateStr);
            months.add(monthStr);
            datesWithHits.push(dateStr);
            
            byDate[dateStr] = byDate[dateStr] || [];
            byDate[dateStr].push(item);
          } catch (e) {
            // Skip invalid dates
          }
        }
        
        // Handle demographics
        if (item.gender) {
          byGender[item.gender] = byGender[item.gender] || [];
          byGender[item.gender].push(item);
        }
        
        if (item.age_group) {
          byAgeGroup[item.age_group] = byAgeGroup[item.age_group] || [];
          byAgeGroup[item.age_group].push(item);
        }
        
        // Handle rank
        if (item.rank_for_viewer != null) {
          const rank = item.rank_for_viewer.toString();
          byRank[rank] = byRank[rank] || [];
          byRank[rank].push(item);
        }
      });
      
      // Set date range based on available data
      if (datesWithHits.length > 0) {
        const sortedDates = [...datesWithHits].sort();
        setStartDate(sortedDates[0]);
        setEndDate(sortedDates[sortedDates.length - 1]);

        const sortedMonths = [...months].sort();
        if (sortedMonths.length > 0) {
          setSelectedMonth(sortedMonths[sortedMonths.length - 1]);
        }
      }
      
      // Store preprocessed data
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
      
      console.timeEnd('Data Preprocessing');
    } catch (err) {
      console.error('Error during data preprocessing:', err);
    }
  }, [data]);

  // Handle offer selection
  const handleOfferSelection = useCallback((offer) => {
    setSelectedOffers(prev => {
      if (offer === 'all') {
        return ['all'];
      } else {
        const newSelection = prev.includes('all') 
          ? [offer]
          : prev.includes(offer)
            ? prev.filter(o => o !== offer)
            : [...prev, offer];
        
        return newSelection.length ? newSelection : ['all'];
      }
    });
  }, []);

  // Memoized filtered data
  const filteredData = useMemo(() => {
    if (!data.length) return [];

    // If we have preprocessed data, use that for faster filtering
    const isAllOffers = selectedOffers.includes('all');
    let result = [];

    // Start with offer filter - significant optimization if specific offers selected
    if (!isAllOffers && processedData.byOffer) {
      // Use preprocessed data for faster lookups
      selectedOffers.forEach(offer => {
        if (processedData.byOffer[offer]) {
          result = [...result, ...processedData.byOffer[offer]];
        }
      });
    } else {
      // Fall back to full data if "All Offers" selected
      result = [...data];
    }

    // Date filter
    if (dateRange !== 'all' && processedData.byDate) {
      const filteredByDate = [];
      
      if (dateRange === 'month' && selectedMonth) {
        // Month filter
        Object.entries(processedData.byDate).forEach(([date, items]) => {
          if (date.startsWith(selectedMonth)) {
            filteredByDate.push(...items);
          }
        });
        
        // Find items that exist both in result and filteredByDate
        // Need to handle the intersection
        if (result.length > 0) {
          const dateItemIds = new Set(filteredByDate.map(item => item.hit_id));
          result = result.filter(item => dateItemIds.has(item.hit_id));
        } else {
          result = filteredByDate;
        }
      } else if (dateRange === 'custom' && startDate && endDate) {
        // Custom date range filter
        Object.entries(processedData.byDate).forEach(([date, items]) => {
          if (date >= startDate && date <= endDate) {
            filteredByDate.push(...items);
          }
        });
        
        // Find items that exist both in result and filteredByDate
        if (result.length > 0) {
          const dateItemIds = new Set(filteredByDate.map(item => item.hit_id));
          result = result.filter(item => dateItemIds.has(item.hit_id));
        } else {
          result = filteredByDate;
        }
      }
    }
    
    return result;
  }, [
    data, 
    selectedOffers, 
    dateRange, 
    startDate, 
    endDate, 
    selectedMonth, 
    processedData
  ]);

  // Apply exclusion rules for first/last days - Memoized
  const exclusionAdjustedData = useMemo(() => {
    if (!filteredData.length || (!excludeFirstDays && !excludeLastDays)) {
      return filteredData;
    }
    
    try {
      // Group data by offer to apply exclusions per offer
      const offerGroups = _.groupBy(filteredData, 'offer_name');
      
      // Process each offer group
      let adjustedData = [];
      Object.entries(offerGroups).forEach(([offerName, offerItems]) => {
        // Skip if no items or no offer name
        if (!offerItems.length || !offerName) return;
        
        // Group by date to identify first/last days
        const itemsByDate = _.groupBy(offerItems, item => {
          try {
            const date = new Date(item.created_at);
            return date.toISOString().split('T')[0];
          } catch (e) {
            return null;
          }
        });
        
        // Remove null date key if present
        delete itemsByDate['null'];
        
        // Get unique dates in sorted order
        const sortedDates = Object.keys(itemsByDate).sort();
        
        // Identify dates to exclude
        const excludeDates = new Set();
        
        if (excludeFirstDays && sortedDates.length > 7) {
          // Exclude first 7 days
          sortedDates.slice(0, 7).forEach(date => excludeDates.add(date));
        }
        
        if (excludeLastDays && sortedDates.length > 3) {
          // Exclude last 3 days
          sortedDates.slice(-3).forEach(date => excludeDates.add(date));
        }
        
        // Filter out excluded dates
        if (excludeDates.size > 0) {
          sortedDates.forEach(date => {
            if (!excludeDates.has(date)) {
              adjustedData = [...adjustedData, ...itemsByDate[date]];
            }
          });
        } else {
          adjustedData = [...adjustedData, ...offerItems];
        }
      });
      
      return adjustedData;
    } catch (err) {
      console.error('Error applying exclusions:', err);
      return filteredData;
    }
  }, [filteredData, excludeFirstDays, excludeLastDays]);

  // Memoized demographic data
  const demographicData = useMemo(() => {
    const { byGender, byAgeGroup } = processedData;
    const adjustedData = exclusionAdjustedData;
    
    if (!adjustedData.length) {
      return { genderData: [], ageData: [] };
    }
    
    try {
      // Gender distribution
      const genderGroups = _.groupBy(adjustedData.filter(item => item.gender), 'gender');
      const genderData = Object.entries(genderGroups).map(([gender, items]) => ({
        name: gender,
        value: items.length,
        percentage: (items.length / adjustedData.length) * 100
      })).sort((a, b) => b.value - a.value);

      // Age group distribution
      const ageGroups = _.groupBy(adjustedData.filter(item => item.age_group), 'age_group');
      const ageData = Object.entries(ageGroups).map(([ageGroup, items]) => ({
        name: ageGroup,
        value: items.length,
        percentage: (items.length / adjustedData.length) * 100
      })).sort((a, b) => b.value - a.value);

      return { genderData, ageData };
    } catch (err) {
      console.error('Error calculating demographic data:', err);
      return { genderData: [], ageData: [] };
    }
  }, [exclusionAdjustedData, processedData]);

  // Memoized offer data
  const offerData = useMemo(() => {
    if (!exclusionAdjustedData.length) return [];
    
    try {
      const offerGroups = _.groupBy(exclusionAdjustedData, 'offer_name');
      
      return Object.entries(offerGroups)
        .filter(([name]) => name) // Filter out undefined names
        .map(([offerName, items]) => {
          // For each offer, calculate average hits per day
          const hitsByDate = _.groupBy(items, item => {
            try {
              const date = new Date(item.created_at);
              return date.toISOString().split('T')[0];
            } catch (e) {
              return null;
            }
          });
          
          delete hitsByDate['null']; // Remove null date key if present
          const dateCount = Object.keys(hitsByDate).length;
          
          return {
            name: offerName || 'Unknown',
            value: items.length,
            percentage: (items.length / exclusionAdjustedData.length) * 100,
            averageHitsPerDay: dateCount ? (items.length / dateCount).toFixed(2) : 0
          };
        })
        .sort((a, b) => b.value - a.value);
    } catch (err) {
      console.error('Error calculating offer data:', err);
      return [];
    }
  }, [exclusionAdjustedData]);

  // Memoized time distribution
  const timeDistribution = useMemo(() => {
    if (!exclusionAdjustedData.length) {
      return { hourData: [], dayData: [], trendData: [] };
    }
    
    try {
      // Extract date from created_at
      const dataWithDates = exclusionAdjustedData
        .filter(item => item.created_at)
        .map(item => {
          try {
            const date = new Date(item.created_at);
            return {
              hour: date.getHours(),
              day: date.getDay(),
              date: date.toISOString().split('T')[0],
              dateObj: date
            };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);
      
      // Group by hour
      const hourGroups = _.groupBy(dataWithDates, 'hour');
      const hourData = Array.from({ length: 24 }, (_, i) => ({
        name: i.toString(),
        value: hourGroups[i] ? hourGroups[i].length : 0
      }));
      
      // Group by day of week
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayGroups = _.groupBy(dataWithDates, 'day');
      const dayData = Array.from({ length: 7 }, (_, i) => ({
        name: dayNames[i],
        value: dayGroups[i] ? dayGroups[i].length : 0
      }));
      
      // Create daily trend data
      const hitsByDate = _.groupBy(dataWithDates, 'date');
      const trendData = Object.entries(hitsByDate)
        .map(([date, items]) => ({
          date,
          count: items.length
        }))
        .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date
      
      return { hourData, dayData, trendData };
    } catch (err) {
      console.error('Error calculating time distribution:', err);
      return { hourData: [], dayData: [], trendData: [] };
    }
  }, [exclusionAdjustedData]);

  // Memoized rank distribution
  const rankData = useMemo(() => {
    if (!exclusionAdjustedData.length) return [];
    
    try {
      const rankGroups = _.groupBy(
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

  // Memoized metrics
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
      // Group hits by date
      const hitsByDate = _.groupBy(exclusionAdjustedData, item => {
        try {
          const date = new Date(item.created_at);
          return date.toISOString().split('T')[0];
        } catch (e) {
          return null;
        }
      });
      
      delete hitsByDate['null']; // Remove null date key if present
      
      // Calculate metrics
      const totalHits = exclusionAdjustedData.length;
      const uniqueDates = Object.keys(hitsByDate);
      const periodDays = uniqueDates.length;
      const averageHitsPerDay = periodDays > 0 ? (totalHits / periodDays).toFixed(2) : 0;
      
      // Calculate hits per offer if we have multiple offers
      const hitsPerOffer = {};
      if (!selectedOffers.includes('all')) {
        const offerGroups = _.groupBy(exclusionAdjustedData, 'offer_name');
        
        selectedOffers.forEach(offer => {
          const offerItems = offerGroups[offer] || [];
          
          // Group by date for this offer
          const offerHitsByDate = _.groupBy(offerItems, item => {
            try {
              const date = new Date(item.created_at);
              return date.toISOString().split('T')[0];
            } catch (e) {
              return null;
            }
          });
          
          delete offerHitsByDate['null']; // Remove null date key
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

  // Pagination helper
  const getPaginatedData = useCallback((dataArray) => {
    const startIndex = (currentPage - 1) * pageSize;
    return dataArray.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize]);

  // Pagination controls
  const renderPagination = useCallback((totalItems) => {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between mt-4">
        <div>
          <span className="text-sm text-gray-700">
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
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-md ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    );
  }, [currentPage, pageSize]);

  // Extract values for rendering
  const { genderData, ageData } = demographicData;
  const { hourData, dayData, trendData } = timeDistribution;

  // Reset pagination when changing tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [insightType]);

  return (
    <div className="p-6 bg-white">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Offer Insights</h2>
        
        {/* Filters */}
        <div className="mb-6 p-4 bg-white rounded-xl shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Offer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Offers</label>
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  onClick={() => handleOfferSelection('all')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedOffers.includes('all')
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All Offers
                </button>
                {processedData.uniqueOffers.map(offer => (
                  <button
                    key={offer}
                    onClick={() => handleOfferSelection(offer)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedOffers.includes(offer) && !selectedOffers.includes('all')
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {offer.length > 30 ? offer.substring(0, 30) + '...' : offer}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  setCurrentPage(1); // Reset pagination
                }}
                className="block w-full p-2 border border-gray-300 rounded-lg focus:ring focus:ring-pink-200 focus:border-pink-500 outline-none mb-2"
              >
                <option value="all">All Time</option>
                <option value="month">Specific Month</option>
                <option value="custom">Custom Range</option>
              </select>

              {dateRange === 'month' && (
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setCurrentPage(1); // Reset pagination
                  }}
                  className="block w-full p-2 border border-gray-300 rounded-lg focus:ring focus:ring-pink-200 focus:border-pink-500 outline-none"
                >
                  {processedData.availableMonths.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              )}

              {dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1); // Reset pagination
                    }}
                    className="block w-full p-2 border border-gray-300 rounded-lg focus:ring focus:ring-pink-200 focus:border-pink-500 outline-none"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1); // Reset pagination
                    }}
                    className="block w-full p-2 border border-gray-300 rounded-lg focus:ring focus:ring-pink-200 focus:border-pink-500 outline-none"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Exclusion Options */}
          <div className="flex items-center gap-6">
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="excludeFirstDays" 
                checked={excludeFirstDays} 
                onChange={() => {
                  setExcludeFirstDays(!excludeFirstDays);
                  setCurrentPage(1); // Reset pagination
                }}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label htmlFor="excludeFirstDays" className="ml-2 text-sm text-gray-700">
                Exclude first 7 days
              </label>
            </div>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="excludeLastDays" 
                checked={excludeLastDays} 
                onChange={() => {
                  setExcludeLastDays(!excludeLastDays);
                  setCurrentPage(1); // Reset pagination
                }}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label htmlFor="excludeLastDays" className="ml-2 text-sm text-gray-700">
                Exclude last 3 days
              </label>
            </div>
          </div>
        </div>
        
        {/* Insight Type Selector */}
        <div className="mb-6 p-4 bg-white rounded-xl shadow-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">Insight Type</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setInsightType('metrics')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                insightType === 'metrics'
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Key Metrics
            </button>
            <button
              onClick={() => setInsightType('demographic')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                insightType === 'demographic'
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Demographics
            </button>
            <button
              onClick={() => setInsightType('time')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                insightType === 'time'
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Time Analysis
            </button>
            <button
              onClick={() => setInsightType('rank')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                insightType === 'rank'
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Rank Analysis
            </button>
            <button
              onClick={() => setInsightType('trends')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                insightType === 'trends'
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Daily Trends
            </button>
          </div>
        </div>

        {/* Loading placeholder */}
        {!processedData.uniqueOffers.length && (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-4"></div>
              <p className="text-gray-600">Processing data...</p>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        {insightType === 'metrics' && processedData.uniqueOffers.length > 0 && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-white rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-700">Total Hits</h3>
                <p className="text-2xl font-bold text-pink-600">{metrics.totalHits.toLocaleString()}</p>
              </div>
              
              <div className="p-4 bg-white rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-700">Period Length</h3>
                <p className="text-2xl font-bold text-pink-600">{metrics.periodDays} days</p>
              </div>
              
              <div className="p-4 bg-white rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-700">Avg. Hits Per Day</h3>
                <p className="text-2xl font-bold text-pink-600">{metrics.averageHitsPerDay}</p>
              </div>
            </div>
          </div>
        )}

        {/* Offer-specific metrics if multiple offers selected */}
        {insightType === 'metrics' && !selectedOffers.includes('all') && processedData.uniqueOffers.length > 0 && (
          <div className="mb-6 p-4 bg-white rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Metrics by Offer</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-pink-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Offer Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Total Hits</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Days Active</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Avg. Hits/Day</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(metrics.hitsPerOffer || {}).map(([offer, stats], idx) => (
                    <tr 
                      key={offer} 
                      className="hover:bg-pink-50"
                      style={{ borderLeft: `4px solid ${COLORS[idx % COLORS.length]}` }}
                    >
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{offer}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{stats.totalHits}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{stats.days}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{stats.averagePerDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content based on selected insight type */}
        {insightType === 'demographic' && processedData.uniqueOffers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gender Distribution */}
            <div className="p-4 bg-white rounded-xl shadow-md">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Gender Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-pink-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Gender</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Count</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {genderData.map((item, idx) => (
                      <tr key={item.name} className="hover:bg-pink-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.value}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Age Group Distribution */}
            <div className="p-4 bg-white rounded-xl shadow-md">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Age Group Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ageData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [value, 'Count']} />
                    <Legend />
                    <Bar dataKey="value" name="Count" fill="#FF0066" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-pink-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Age Group</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Count</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ageData.map((item, idx) => (
                      <tr key={item.name} className="hover:bg-pink-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.value}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {insightType === 'time' && processedData.uniqueOffers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hour of Day Analysis */}
            <div className="p-4 bg-white rounded-xl shadow-md">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Hour of Day Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={hourData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" label={{ value: 'Hour', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => [value, 'Count']} />
                    <Legend />
                    <Bar dataKey="value" name="Count" fill="#FF0066" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Day of Week Analysis */}
            <div className="p-4 bg-white rounded-xl shadow-md">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Day of Week Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dayData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => [value, 'Count']} />
                    <Legend />
                    <Bar dataKey="value" name="Count" fill="#0066CC" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {insightType === 'rank' && processedData.uniqueOffers.length > 0 && (
          <div className="p-4 bg-white rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Rank Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rankData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" label={{ value: 'Rank', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => [value, 'Count']} />
                  <Legend />
                  <Bar dataKey="value" name="Count" fill="#FF0066" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Paginated table for rank data */}
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-pink-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Rank</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Count</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Percentage</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getPaginatedData(rankData).map((item) => (
                    <tr 
                      key={item.name} 
                      className="hover:bg-pink-50"
                    >
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.value}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination for rank table */}
              {renderPagination(rankData.length)}
            </div>
          </div>
        )}

        {insightType === 'trends' && processedData.uniqueOffers.length > 0 && (
          <div className="p-4 bg-white rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Daily Hit Trends</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45} 
                    textAnchor="end"
                    height={70} 
                    tick={{ fontSize: 10 }}
                    interval={Math.ceil(trendData.length / 20)} // Dynamic interval based on data size
                  />
                  <YAxis label={{ value: 'Hits', angle: -90, position: 'insideLeft' }} />
                  <Tooltip labelFormatter={(value) => `Date: ${value}`} />
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Daily Hits" stroke="#FF0066" dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-700 mb-2">Daily Average: {metrics.averageHitsPerDay} hits/day</h4>
              <p className="text-sm text-gray-600">
                {excludeFirstDays && "* First 7 days excluded from the analysis"}
                {excludeFirstDays && excludeLastDays && ", "}
                {excludeLastDays && "* Last 3 days excluded from the analysis"}
              </p>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        {insightType === 'metrics' && offerData.length > 1 && processedData.uniqueOffers.length > 0 && (
          <div className="mt-6 p-4 bg-white rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Offer Performance Comparison</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-pink-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Offer</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Total Hits</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Avg Hits/Day</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Share (%)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getPaginatedData(offerData).map((item, idx) => (
                    <tr 
                      key={item.name} 
                      className="hover:bg-pink-50"
                      style={{ borderLeft: `4px solid ${COLORS[idx % COLORS.length]}` }}
                    >
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.value}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.averageHitsPerDay}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination for offer comparison table */}
              {renderPagination(offerData.length)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default OfferInsights;