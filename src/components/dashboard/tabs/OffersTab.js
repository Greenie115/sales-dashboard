import React, { useState, useEffect, useMemo } from 'react';
import { useDashboard } from '../../../context/DashboardContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart,
  Pie, Cell, LineChart, Line
} from 'recharts';
import _ from 'lodash';

const COLORS = ['#FF0066', '#0066CC', '#FFC107', '#00ACC1', '#9C27B0', '#4CAF50', '#FF9800'];
const DEFAULT_PAGE_SIZE = 10;

const OffersTab = () => {
  const { state, actions } = useDashboard();
  const { offerData } = state;

  // Local state
  const [selectedOffers, setSelectedOffers] = useState(['all']);
  const [insightType, setInsightType] = useState('metrics');
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

      offerData.forEach(item => {
        if (item.offer_name) {
          uniqueOffers.add(item.offer_name);
          byOffer[item.offer_name] = byOffer[item.offer_name] || [];
          byOffer[item.offer_name].push(item);
        }
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

  // Apply exclusion rules for first/last days
  const exclusionAdjustedData = useMemo(() => {
    if (!filteredOfferData.length || (!excludeFirstDays && !excludeLastDays)) {
      return filteredOfferData;
    }
    try {
      const offerGroups = _.groupBy(filteredOfferData, 'offer_name');
      let adjustedData = [];
      Object.entries(offerGroups).forEach(([offerName, offerItems]) => {
        if (!offerItems.length || !offerName) return;
        const itemsByDate = _.groupBy(offerItems, item => {
          try {
            const date = new Date(item.created_at);
            return date.toISOString().split('T')[0];
          } catch (e) {
            return null;
          }
        });
        delete itemsByDate['null'];
        const sortedDates = Object.keys(itemsByDate).sort();
        const excludeDates = new Set();
        if (excludeFirstDays && sortedDates.length > 7) {
          sortedDates.slice(0, 7).forEach(date => excludeDates.add(date));
        }
        if (excludeLastDays && sortedDates.length > 3) {
          sortedDates.slice(-3).forEach(date => excludeDates.add(date));
        }
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
      return filteredOfferData;
    }
  }, [filteredOfferData, excludeFirstDays, excludeLastDays]);

  // Gender distribution
  const genderData = useMemo(() => {
    const adjustedData = exclusionAdjustedData;
    if (!adjustedData.length) return [];
    try {
      const genderGroups = _.groupBy(adjustedData.filter(item => item.gender), 'gender');
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
      const ageGroups = _.groupBy(adjustedData.filter(item => item.age_group), 'age_group');
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

  // Time distribution
  const { hourData, dayData, trendData } = useMemo(() => {
    if (!exclusionAdjustedData.length) {
      return { hourData: [], dayData: [], trendData: [] };
    }
    try {
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

      const hourGroups = _.groupBy(dataWithDates, 'hour');
      const hourData = Array.from({ length: 24 }, (_, i) => ({
        name: i.toString(),
        value: hourGroups[i] ? hourGroups[i].length : 0
      }));

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayGroups = _.groupBy(dataWithDates, 'day');
      const dayData = Array.from({ length: 7 }, (_, i) => ({
        name: dayNames[i],
        value: dayGroups[i] ? dayGroups[i].length : 0
      }));

      const hitsByDate = _.groupBy(dataWithDates, 'date');
      const trendData = Object.entries(hitsByDate)
        .map(([date, items]) => ({ date, count: items.length }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return { hourData, dayData, trendData };
    } catch (err) {
      console.error('Error calculating time distribution:', err);
      return { hourData: [], dayData: [], trendData: [] };
    }
  }, [exclusionAdjustedData]);

  // Rank distribution
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
      const hitsByDate = _.groupBy(exclusionAdjustedData, item => {
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
        const offerGroups = _.groupBy(exclusionAdjustedData, 'offer_name');
        selectedOffers.forEach(offer => {
          const offerItems = offerGroups[offer] || [];
          const offerHitsByDate = _.groupBy(offerItems, item => {
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
            className={`px-3 py-1 rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-pink-50 text-pink-600 hover:bg-pink-100'}`}
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-md ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-pink-50 text-pink-600 hover:bg-pink-100'}`}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  // Reset pagination when changing insight type
  useEffect(() => {
    setCurrentPage(1);
  }, [insightType]);

  // Consolidated export data useEffect (inside the component)
  useEffect(() => {
    if (!actions || !actions.setExportData) return;
    const exportData = {
      offerData: {
        metrics,
        offerData: filteredOfferData,
        genderData,
        ageData,
        timeData: { hourData, dayData, trendData },
        rankData,
        selectedOffers,
        excludeFirstDays,
        excludeLastDays
      }
    };
    actions.setExportData(exportData);
  }, [
    actions,
    filteredOfferData,
    genderData,
    ageData,
    metrics,
    hourData,
    dayData,
    trendData,
    rankData,
    selectedOffers,
    excludeFirstDays,
    excludeLastDays
  ]);

  // If no data available, show a loading/empty state
  if (!offerData || offerData.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-4"></div>
          <p className="text-gray-600">No offer data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white">
      {/* (The rest of your JSX for filters, charts, tables, etc. remains unchanged) */}
      {/* ... */}
    </div>
  );
};

export default OffersTab;
