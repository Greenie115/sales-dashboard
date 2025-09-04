// src/utils/advancedAnalytics.js
// Utility functions for advanced analytics

/**
 * Detect anomalies in time-series data using statistical methods
 */
export const detectAnomalies = (dataPoints, sensitivity = 2) => {
  if (!dataPoints || dataPoints.length < 7) return [];

  // Calculate rolling statistics
  const values = dataPoints.map(point => point.value || point.count || 0);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  const threshold = sensitivity * stdDev;
  
  return dataPoints.map((point, index) => {
    const value = point.value || point.count || 0;
    const deviation = Math.abs(value - mean);
    const isAnomaly = deviation > threshold;
    
    return {
      ...point,
      isAnomaly,
      deviation: deviation / stdDev, // Z-score
      severity: isAnomaly ? (deviation > threshold * 1.5 ? 'high' : 'medium') : 'low'
    };
  }).filter(point => point.isAnomaly);
};

/**
 * Calculate moving averages for trend analysis
 */
export const calculateMovingAverage = (dataPoints, window = 7) => {
  if (!dataPoints || dataPoints.length < window) return dataPoints;

  return dataPoints.map((point, index) => {
    if (index < window - 1) return { ...point, movingAverage: null };
    
    const windowData = dataPoints.slice(index - window + 1, index + 1);
    const sum = windowData.reduce((acc, item) => acc + (item.value || item.count || 0), 0);
    const movingAverage = sum / window;
    
    return {
      ...point,
      movingAverage: Math.round(movingAverage * 100) / 100
    };
  });
};

/**
 * Identify seasonal patterns in data
 */
export const identifySeasonalPatterns = (dataPoints, period = 7) => {
  if (!dataPoints || dataPoints.length < period * 2) return null;

  const groupedByPeriod = {};
  dataPoints.forEach((point, index) => {
    const periodIndex = index % period;
    if (!groupedByPeriod[periodIndex]) groupedByPeriod[periodIndex] = [];
    groupedByPeriod[periodIndex].push(point.value || point.count || 0);
  });

  const seasonalPattern = Object.keys(groupedByPeriod).map(key => {
    const values = groupedByPeriod[key];
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    return {
      periodIndex: parseInt(key),
      averageValue: Math.round(avg * 100) / 100,
      sampleSize: values.length
    };
  });

  // Find peak and trough
  const peak = seasonalPattern.reduce((max, curr) => 
    curr.averageValue > max.averageValue ? curr : max
  );
  const trough = seasonalPattern.reduce((min, curr) => 
    curr.averageValue < min.averageValue ? curr : min
  );

  return {
    pattern: seasonalPattern,
    peak,
    trough,
    seasonality: peak.averageValue / trough.averageValue // Seasonal strength ratio
  };
};

/**
 * Calculate growth rates and trends
 */
export const calculateGrowthMetrics = (currentPeriod, previousPeriod) => {
  if (!currentPeriod || !previousPeriod) return null;

  const current = currentPeriod.reduce((sum, item) => sum + (item.value || item.count || 0), 0);
  const previous = previousPeriod.reduce((sum, item) => sum + (item.value || item.count || 0), 0);

  if (previous === 0) return null;

  const growthRate = ((current - previous) / previous) * 100;
  const absoluteChange = current - previous;

  return {
    current,
    previous,
    growthRate: Math.round(growthRate * 10) / 10,
    absoluteChange,
    direction: growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'flat',
    significance: Math.abs(growthRate) > 5 ? 'significant' : 'minor'
  };
};

/**
 * Detect correlations between different metrics
 */
export const findCorrelations = (dataSet1, dataSet2, threshold = 0.5) => {
  if (!dataSet1 || !dataSet2 || dataSet1.length !== dataSet2.length) return null;

  const n = dataSet1.length;
  const sum1 = dataSet1.reduce((sum, val) => sum + val, 0);
  const sum2 = dataSet2.reduce((sum, val) => sum + val, 0);
  const sum1Sq = dataSet1.reduce((sum, val) => sum + val * val, 0);
  const sum2Sq = dataSet2.reduce((sum, val) => sum + val * val, 0);
  const sum1Sum2 = dataSet1.reduce((sum, val, i) => sum + val * dataSet2[i], 0);

  const numerator = n * sum1Sum2 - sum1 * sum2;
  const denominator = Math.sqrt((n * sum1Sq - sum1 * sum1) * (n * sum2Sq - sum2 * sum2));

  if (denominator === 0) return null;

  const correlation = numerator / denominator;
  const isSignificant = Math.abs(correlation) > threshold;

  return {
    correlation: Math.round(correlation * 1000) / 1000,
    strength: Math.abs(correlation) > 0.7 ? 'strong' : 
              Math.abs(correlation) > 0.3 ? 'moderate' : 'weak',
    direction: correlation > 0 ? 'positive' : 'negative',
    isSignificant
  };
};

/**
 * Generate smart insights from data analysis
 */
export const generateSmartInsights = (data, timeSeriesData, previousPeriodData) => {
  const insights = [];

  // Anomaly insights
  if (timeSeriesData && timeSeriesData.length > 7) {
    const anomalies = detectAnomalies(timeSeriesData, 2);
    if (anomalies.length > 0) {
      const recentAnomalies = anomalies.slice(-3); // Last 3 anomalies
      recentAnomalies.forEach(anomaly => {
        insights.push({
          type: 'anomaly',
          severity: anomaly.severity,
          title: anomaly.severity === 'high' ? 'Significant Anomaly Detected' : 'Unusual Pattern Detected',
          text: `${anomaly.name || 'Data point'} shows ${anomaly.deviation > 0 ? 'unusually high' : 'unusually low'} activity (${Math.abs(anomaly.deviation).toFixed(1)}σ from normal)`,
          actionable: true,
          recommendation: anomaly.deviation > 0 ? 'Investigate potential causes of this spike' : 'Monitor for potential issues causing this drop'
        });
      });
    }
  }

  // Seasonal pattern insights
  if (timeSeriesData && timeSeriesData.length > 14) {
    const seasonalPattern = identifySeasonalPatterns(timeSeriesData, 7);
    if (seasonalPattern && seasonalPattern.seasonality > 1.3) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      insights.push({
        type: 'seasonal',
        title: 'Strong Weekly Pattern Detected',
        text: `${dayNames[seasonalPattern.peak.periodIndex]} consistently performs ${((seasonalPattern.seasonality - 1) * 100).toFixed(0)}% better than ${dayNames[seasonalPattern.trough.periodIndex]}`,
        actionable: true,
        recommendation: `Focus marketing efforts on ${dayNames[seasonalPattern.peak.periodIndex]}s, investigate why ${dayNames[seasonalPattern.trough.periodIndex]}s underperform`
      });
    }
  }

  // Growth insights
  if (data && previousPeriodData) {
    const growth = calculateGrowthMetrics(data, previousPeriodData);
    if (growth && growth.significance === 'significant') {
      insights.push({
        type: 'growth',
        title: growth.direction === 'up' ? 'Strong Growth Detected' : 'Significant Decline Detected',
        text: `Performance is ${growth.direction} ${Math.abs(growth.growthRate).toFixed(1)}% compared to the previous period`,
        actionable: true,
        recommendation: growth.direction === 'up' ? 
          'Consider scaling successful strategies' : 
          'Investigate causes and develop recovery plan'
      });
    }
  }

  return insights;
};