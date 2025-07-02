import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useSharingContext } from '../../context/SharingContext';
import { useTheme } from '../../context/ThemeContext';
import { useChartColors } from '../../utils/chartColors';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const AdminDashboard = () => {
  const { darkMode } = useTheme();
  const colors = useChartColors();
  const { salesData, brandMapping } = useData();
  const { shares } = useSharingContext();
  
  const [systemMetrics, setSystemMetrics] = useState({
    uptime: 0,
    memoryUsage: 0,
    loadTime: 0,
    errorCount: 0
  });

  // Simulate system metrics
  useEffect(() => {
    const updateMetrics = () => {
      setSystemMetrics({
        uptime: Math.floor((Date.now() - performance.timing.navigationStart) / 1000 / 60), // Minutes since page load
        memoryUsage: navigator.deviceMemory ? Math.random() * navigator.deviceMemory * 0.5 : Math.random() * 4,
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        errorCount: Math.floor(Math.random() * 3) // Random error count for demo
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Data usage analytics
  const dataAnalytics = useMemo(() => {
    if (!salesData || salesData.length === 0) return null;

    const totalRecords = salesData.length;
    const uniqueRetailers = new Set(salesData.map(item => item.chain)).size;
    const uniqueProducts = new Set(salesData.map(item => item.product_name)).size;
    const dateRange = salesData.reduce((range, item) => {
      const date = new Date(item.receipt_date);
      if (!range.start || date < range.start) range.start = date;
      if (!range.end || date > range.end) range.end = date;
      return range;
    }, { start: null, end: null });

    // Monthly data volume
    const monthlyData = salesData.reduce((acc, item) => {
      const month = new Date(item.receipt_date).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    const monthlyChart = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // Last 12 months
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        records: count
      }));

    return {
      totalRecords,
      uniqueRetailers,
      uniqueProducts,
      dateRange,
      monthlyChart,
      averageRecordsPerDay: Math.round(totalRecords / ((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24)) || 1)
    };
  }, [salesData]);

  // Sharing analytics  
  const sharingAnalytics = useMemo(() => {
    if (!shares || shares.length === 0) return null;

    const activeShares = shares.filter(share => new Date(share.expiresAt) > new Date()).length;
    const expiredShares = shares.length - activeShares;
    
    const sharingByType = shares.reduce((acc, share) => {
      const config = share.config || {};
      const type = config.hideValues && config.hideRetailers ? 'Anonymous' : 
                   config.hideRetailers ? 'Hidden Retailers' :
                   config.hideValues ? 'Hidden Values' : 'Open';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const sharingTypeChart = Object.entries(sharingByType).map(([type, count]) => ({
      name: type,
      value: count
    }));

    return {
      totalShares: shares.length,
      activeShares,
      expiredShares,
      sharingTypeChart
    };
  }, [shares]);

  // Performance metrics
  const performanceData = useMemo(() => {
    const metrics = [];
    const now = Date.now();
    
    // Generate last 24 hours of mock performance data
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now - i * 60 * 60 * 1000);
      metrics.push({
        time: hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        responseTime: Math.random() * 200 + 50, // 50-250ms
        requests: Math.floor(Math.random() * 100) + 10, // 10-110 requests
        errors: Math.floor(Math.random() * 5) // 0-5 errors
      });
    }
    
    return metrics;
  }, []);

  if (!dataAnalytics) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="mt-2 text-lg font-semibold text-gray-700 dark:text-gray-300">Admin Dashboard</h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400">No data available for monitoring</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 shadow-md rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
              <span className="inline-block w-3 h-3 mr-1 rounded-full" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">System Administration</h1>
        
        {/* System Health Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-800/30">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">System Status</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">Online</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Uptime: {systemMetrics.uptime}m</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800/30">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Performance</p>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">{systemMetrics.loadTime}ms</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Load time</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800/30">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Memory Usage</p>
                <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">{systemMetrics.memoryUsage.toFixed(1)}GB</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Current usage</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30 p-4 rounded-lg border border-red-200 dark:border-red-800/30">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Errors</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">{systemMetrics.errorCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Last 24h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Data Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Records</span>
                <span className="font-semibold text-gray-900 dark:text-white">{dataAnalytics.totalRecords.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Unique Retailers</span>
                <span className="font-semibold text-gray-900 dark:text-white">{dataAnalytics.uniqueRetailers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Unique Products</span>
                <span className="font-semibold text-gray-900 dark:text-white">{dataAnalytics.uniqueProducts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Avg Records/Day</span>
                <span className="font-semibold text-gray-900 dark:text-white">{dataAnalytics.averageRecordsPerDay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Date Range</span>
                <span className="font-semibold text-gray-900 dark:text-white text-xs">
                  {dataAnalytics.dateRange.start?.toLocaleDateString()} - {dataAnalytics.dateRange.end?.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {sharingAnalytics && (
            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Sharing Activity</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Shares</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{sharingAnalytics.totalShares}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Active Shares</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{sharingAnalytics.activeShares}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Expired Shares</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{sharingAnalytics.expiredShares}</span>
                </div>
              </div>
              
              {sharingAnalytics.sharingTypeChart.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sharing Types</h4>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={sharingAnalytics.sharingTypeChart}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        innerRadius={30}
                      >
                        {sharingAnalytics.sharingTypeChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colors.colorPalette[index % colors.colorPalette.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Data Volume */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Monthly Data Volume</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dataAnalytics.monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} />
                <XAxis 
                  dataKey="month"
                  tick={{ fontSize: 12, fill: colors.textSecondary }}
                  tickLine={false}
                  axisLine={{ stroke: colors.axisColor }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: colors.textSecondary }}
                  tickLine={false}
                  axisLine={{ stroke: colors.axisColor }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="records" fill={colors.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Performance (24h)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} />
                <XAxis 
                  dataKey="time"
                  tick={{ fontSize: 12, fill: colors.textSecondary }}
                  tickLine={false}
                  axisLine={{ stroke: colors.axisColor }}
                  interval={5}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: colors.textSecondary }}
                  tickLine={false}
                  axisLine={{ stroke: colors.axisColor }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke={colors.primary} 
                  strokeWidth={2}
                  dot={false}
                  name="Response Time (ms)"
                />
                <Line 
                  type="monotone" 
                  dataKey="requests" 
                  stroke={colors.secondary} 
                  strokeWidth={2}
                  dot={false}
                  name="Requests"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;