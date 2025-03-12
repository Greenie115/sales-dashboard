// src/hooks/useDashboardMetrics.js
import { useMemo } from 'react';
import _ from 'lodash';

/**
 * Hook for calculating key dashboard metrics from data
 * 
 * @param {Array} data - The dataset to analyze
 * @returns {Object} Calculated metrics
 */
export const useDashboardMetrics = (data = []) => {
  /**
   * Calculate core metrics for the dashboard
   */
  const metrics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalUnits: 0,
        uniqueDates: [],
        daysInRange: 0,
        totalValue: 0,
        avgRedemptionsPerDay: '0'
      };
    }
    
    try {
      // Extract dates from data
      const datesWithValues = data
        .map(item => item.receipt_date)
        .filter(Boolean);
      
      // Get unique, sorted dates
      const uniqueDates = _.uniq(datesWithValues).sort();
      const daysInRange = uniqueDates.length;
      
      // Calculate total value
      const totalValue = data.reduce((sum, item) => {
        return sum + (parseFloat(item.receipt_total) || 0);
      }, 0);
      
      // Calculate average per day
      const avgPerDay = daysInRange > 0 ? data.length / daysInRange : 0;
      
      return {
        totalUnits: data.length,
        uniqueDates,
        daysInRange,
        totalValue,
        avgRedemptionsPerDay: avgPerDay.toFixed(1)
      };
    } catch (e) {
      console.error("Error calculating metrics:", e);
      return {
        totalUnits: 0,
        uniqueDates: [],
        daysInRange: 0,
        totalValue: 0,
        avgRedemptionsPerDay: '0'
      };
    }
  }, [data]);
  
  /**
   * Calculate growth metrics comparing two periods
   * 
   * @param {Array} comparisonData - Data from comparison period
   * @returns {Object} Growth metrics
   */
  const calculateGrowthMetrics = (comparisonData = []) => {
    if (!data || data.length === 0 || !comparisonData || comparisonData.length === 0) {
      return {
        unitGrowth: 0,
        unitGrowthPercentage: 0,
        valueGrowth: 0,
        valueGrowthPercentage: 0,
        dailyVolumeGrowth: 0,
        dailyVolumeGrowthPercentage: 0
      };
    }
    
    try {
      // Current period metrics
      const currentPeriodMetrics = metrics;
      
      // Calculate comparison period metrics
      const compDatesWithValues = comparisonData
        .map(item => item.receipt_date)
        .filter(Boolean);
      
      const compUniqueDates = _.uniq(compDatesWithValues).sort();
      const compDaysInRange = compUniqueDates.length;
      
      const compTotalValue = comparisonData.reduce((sum, item) => {
        return sum + (parseFloat(item.receipt_total) || 0);
      }, 0);
      
      const compAvgPerDay = compDaysInRange > 0 ? comparisonData.length / compDaysInRange : 0;
      
      // Calculate growth
      const unitGrowth = currentPeriodMetrics.totalUnits - comparisonData.length;
      const unitGrowthPercentage = comparisonData.length !== 0 ? 
        (unitGrowth / comparisonData.length) * 100 : 0;
      
      const valueGrowth = currentPeriodMetrics.totalValue - compTotalValue;
      const valueGrowthPercentage = compTotalValue !== 0 ? 
        (valueGrowth / compTotalValue) * 100 : 0;
      
      const dailyVolumeGrowth = parseFloat(currentPeriodMetrics.avgRedemptionsPerDay) - compAvgPerDay;
      const dailyVolumeGrowthPercentage = compAvgPerDay !== 0 ? 
        (dailyVolumeGrowth / compAvgPerDay) * 100 : 0;
      
      return {
        unitGrowth,
        unitGrowthPercentage,
        valueGrowth,
        valueGrowthPercentage,
        dailyVolumeGrowth,
        dailyVolumeGrowthPercentage
      };
    } catch (e) {
      console.error("Error calculating growth metrics:", e);
      return {
        unitGrowth: 0,
        unitGrowthPercentage: 0,
        valueGrowth: 0,
        valueGrowthPercentage: 0,
        dailyVolumeGrowth: 0,
        dailyVolumeGrowthPercentage: 0
      };
    }
  };
  
  /**
   * Get key insights from the data
   * 
   * @returns {Array} Array of insight objects
   */
  const getKeyInsights = () => {
    if (!data || data.length === 0) {
      return [];
    }
    
    try {
      const insights = [];
      
      // Find top retailer
      const retailerGroups = _.groupBy(data, 'chain');
      const topRetailer = Object.entries(retailerGroups)
        .map(([chain, items]) => ({
          name: chain || 'Unknown',
          count: items.length,
          percentage: (items.length / data.length) * 100
        }))
        .sort((a, b) => b.count - a.count)[0];
      
      if (topRetailer) {
        insights.push({
          type: 'retailer',
          text: `${topRetailer.name} is your top retailer with ${topRetailer.percentage.toFixed(1)}% of redemptions`,
          data: topRetailer.percentage.toFixed(1) + '%'
        });
      }
      
      // Find best performing day of week
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayGroups = _.groupBy(data, 'day_of_week');
      
      const dayDistribution = dayNames.map((name, index) => {
        const items = dayGroups[index] || [];
        return {
          name: name.substring(0, 3), // Shortened day name
          value: items.length,
          percentage: (items.length / data.length) * 100
        };
      });
      
      const bestDay = _.maxBy(dayDistribution, 'value');
      if (bestDay) {
        insights.push({
          type: 'day',
          text: `${bestDay.name} is your best performing day with ${bestDay.percentage.toFixed(1)}% of redemptions`,
          data: bestDay.percentage.toFixed(1) + '%'
        });
      }
      
      // Calculate trend (last 7 days vs previous 7 days)
      const sortedByDate = _.sortBy(data, 'receipt_date');
      const dates = _.uniq(sortedByDate.map(item => item.receipt_date));
      
      if (dates.length > 14) {
        const last7Days = dates.slice(-7);
        const previous7Days = dates.slice(-14, -7);
        
        const last7DaysData = data.filter(item => last7Days.includes(item.receipt_date));
        const previous7DaysData = data.filter(item => previous7Days.includes(item.receipt_date));
        
        const last7Count = last7DaysData.length;
        const previous7Count = previous7DaysData.length;
        
        if (previous7Count > 0) {
          const change = ((last7Count - previous7Count) / previous7Count) * 100;
          const direction = last7Count >= previous7Count ? 'up' : 'down';
          
          insights.push({
            type: 'trend',
            text: direction === 'up'
              ? `Sales are up ${Math.abs(change).toFixed(1)}% in the last 7 days`
              : `Sales are down ${Math.abs(change).toFixed(1)}% in the last 7 days`,
            data: Math.abs(change).toFixed(1) + '%',
            status: direction === 'up' ? 'positive' : 'negative'
          });
        }
      }
      
      return insights;
    } catch (e) {
      console.error("Error calculating insights:", e);
      return [];
    }
  };
  
  /**
   * Calculate demographic metrics
   * 
   * @returns {Object} Demographic distribution data
   */
  const getDemographicMetrics = () => {
    if (!data || data.length === 0) {
      return { 
        ageDistribution: [], 
        genderDistribution: [] 
      };
    }
    
    try {
      // Age distribution
      const ageGroups = _.groupBy(
        data.filter(item => item.age_group), 
        'age_group'
      );
      
      const ageDistribution = Object.entries(ageGroups)
        .map(([ageGroup, items]) => ({
          ageGroup,
          count: items.length,
          percentage: (items.length / data.length) * 100
        }))
        .sort((a, b) => b.count - a.count);
      
      // Gender distribution
      const genderGroups = _.groupBy(
        data.filter(item => item.gender),
        'gender'
      );
      
      const genderDistribution = Object.entries(genderGroups)
        .map(([gender, items]) => ({
          name: gender,
          value: items.length,
          percentage: (items.length / data.length) * 100
        }))
        .sort((a, b) => b.value - a.value);
      
      return {
        ageDistribution,
        genderDistribution
      };
    } catch (e) {
      console.error("Error calculating demographic metrics:", e);
      return { 
        ageDistribution: [], 
        genderDistribution: [] 
      };
    }
  };
  
  return {
    metrics,
    calculateGrowthMetrics,
    getKeyInsights,
    getDemographicMetrics
  };
};