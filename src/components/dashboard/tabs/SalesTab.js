import React, { useState, useMemo, useCallback } from 'react';
import { useData } from '../../../context/DataContext';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ComposedChart, Line, Area
} from 'recharts';
import _ from 'lodash';
import ExportButton from '../export/ExportButton';

// Custom color palette
const COLORS = ['#FF0066', '#0066CC', '#FFC107', '#00ACC1', '#9C27B0', '#4CAF50', '#FF9800', '#607D8B', '#673AB7', '#3F51B5'];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-md rounded-md border border-gray-200">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm text-gray-600">
            <span className="inline-block w-3 h-3 mr-1 rounded-full" style={{ backgroundColor: entry.color }}></span>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const SalesTab = () => {
  const { 
    getFilteredData, 
    calculateMetrics, 
    brandMapping = {}, // Add default empty object
    brandNames = [],   // Add default empty array
    getProductDistribution,
    getRedemptionsOverTime,
    calculateTrendLine
  } = useData();
  
  // Local state
  const [redemptionTimeframe, setRedemptionTimeframe] = useState('daily');
  const [showTrendLine, setShowTrendLine] = useState(true);
  const [activeRetailer, setActiveRetailer] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [chartView, setChartView] = useState('pie'); // 'pie' or 'bar'
  
  // Get filtered data
  const filteredData = useMemo(() => {
    return getFilteredData ? getFilteredData() : [];
  }, [getFilteredData]);
  
  // Get metrics
  const metrics = useMemo(() => {
    return calculateMetrics ? calculateMetrics() : null;
  }, [calculateMetrics]);
  
  // Get retailer distribution
  const retailerData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    
    const groupedByRetailer = _.groupBy(filteredData, 'chain');
    const totalUnits = filteredData.length;
    
    return Object.entries(groupedByRetailer)
      .map(([chain, items]) => ({
        name: chain || 'Unknown',
        value: items.length,
        percentage: (items.length / totalUnits) * 100
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);
  
  // Get product distribution
  const productDistribution = useMemo(() => {
    if (!getProductDistribution) return [];
    return getProductDistribution(filteredData, brandMapping);
  }, [filteredData, brandMapping, getProductDistribution]);
  
  // Get redemptions over time
  const redemptionsOverTime = useMemo(() => {
    return getRedemptionsOverTime ? getRedemptionsOverTime(filteredData, redemptionTimeframe) : [];
  }, [filteredData, redemptionTimeframe, getRedemptionsOverTime]);
  
  // Calculate trend line
  const trendLineData = useMemo(() => {
    return calculateTrendLine ? calculateTrendLine(redemptionsOverTime) : [];
  }, [redemptionsOverTime, calculateTrendLine]);
  
  // Handle retailer selection for detailed view
  const handleRetailerClick = useCallback((retailer) => {
    setSelectedRetailer(prevRetailer => 
      prevRetailer && prevRetailer.name === retailer.name ? null : retailer
    );
  }, []);

  // Handle product selection for detailed view
  const handleProductClick = useCallback((product) => {
    setSelectedProduct(prevProduct => 
      prevProduct && prevProduct.displayName === product.displayName ? null : product
    );
  }, []);

  // Toggle chart view between pie and bar
  const toggleChartView = useCallback(() => {
    setChartView(prev => prev === 'pie' ? 'bar' : 'pie');
  }, []);
  
  // Helper function to format date in "24 Feb 2025" style
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = date.getDate().toString();
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      
      return `${day} ${month} ${year}`;
    } catch (error) {
      return dateString;
    }
  };
  
  // Handle empty data
  if (!filteredData || filteredData.length === 0 || !metrics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-4"></div>
          <p className="text-gray-600">No data available for Sales Analysis</p>
        </div>
      </div>
    );
  }

  // Get export data
  const exportData = {
    retailerData,
    productDistribution,
    brandMapping
  };
  
  return (
    <div>
      {/* Actions Bar with Export Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Sales Analysis</h2>
        <ExportButton activeTab="sales" tabData={exportData} />
      </div>
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-start">
            <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Total Redemptions</h3>
              <p className="text-3xl font-bold text-pink-600">{metrics?.totalUnits.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-start">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Average Per Day</h3>
              <p className="text-3xl font-bold text-blue-600">{metrics?.avgRedemptionsPerDay}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-start">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Date Range</h3>
              <p className="text-md font-medium text-green-600">
                {metrics && metrics.uniqueDates && metrics.uniqueDates.length > 0 ? 
                  `${formatDate(metrics.uniqueDates[0])} to ${formatDate(metrics.uniqueDates[metrics.uniqueDates.length - 1])}` :
                  "No date range"
                }
              </p>
              <p className="text-gray-600 text-sm">{metrics.daysInRange} days</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Retailer and Product Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Retailer Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Retailer Distribution
            </h3>
            
            {/* Toggle Chart Type Button */}
            <button 
              onClick={toggleChartView}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {chartView === 'pie' ? (
                <>
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" />
                    <path d="M8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4z" />
                    <path d="M14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  Bar Chart
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.5A1.5 1.5 0 017.5 7h-1A1.5 1.5 0 015 5.5V5a1 1 0 00-2 0v.5A3.5 3.5 0 006.5 9h1a3.5 3.5 0 003.5-3.5V5a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Pie Chart
                </>
              )}
            </button>
          </div>
          
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'pie' ? (
                <PieChart>
                  <Pie
                    data={retailerData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    innerRadius={60}
                    paddingAngle={2}
                    onMouseEnter={(data, index) => setActiveRetailer(index)}
                    onMouseLeave={() => setActiveRetailer(null)}
                    onClick={(data) => handleRetailerClick(data)}
                    label={({ name, percent }) => 
                      percent > 0.05 ? `${name}: ${(percent * 100).toFixed(1)}%` : ''
                    }
                    labelLine={false}
                  >
                    {retailerData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={1}
                        style={{
                          opacity: activeRetailer === null || activeRetailer === index ? 1 : 0.6,
                          filter: activeRetailer === index ? 'drop-shadow(0px 0px 4px rgba(0,0,0,0.2))' : 'none',
                          transition: 'opacity 300ms, filter 300ms',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ paddingLeft: '30px' }}
                    iconType="circle"
                    onMouseEnter={(data, index) => setActiveRetailer(index)}
                    onMouseLeave={() => setActiveRetailer(null)}
                    onClick={(data, index) => handleRetailerClick(retailerData[index])}
                    formatter={(value, entry, index) => (
                      <span 
                        className={`text-sm ${activeRetailer === index ? 'font-bold text-gray-900' : 'text-gray-600'}`}
                        style={{ cursor: 'pointer' }}
                      >
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              ) : (
                <BarChart
                  data={retailerData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120}
                    tick={{
                      fontSize: 12,
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    name="Units" 
                    fill="#0066CC"
                    onClick={(data) => handleRetailerClick(data)}
                    style={{ cursor: 'pointer' }}
                  >
                    {retailerData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        opacity={selectedRetailer && selectedRetailer.name !== entry.name ? 0.7 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 overflow-auto max-h-64">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retailer</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {retailerData.map((retailer, index) => (
                  <tr 
                    key={index} 
                    className={`hover:bg-gray-50 ${selectedRetailer && selectedRetailer.name === retailer.name ? 'bg-blue-50' : ''}`}
                    onClick={() => handleRetailerClick(retailer)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <div className="text-sm font-medium text-gray-900">{retailer.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{retailer.value.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{retailer.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Selected Retailer Details */}
          {selectedRetailer && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-md font-medium text-blue-800">Retailer: {selectedRetailer.name}</h4>
                <button 
                  onClick={() => setSelectedRetailer(null)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Units</span>
                  <p className="text-lg font-semibold text-gray-900">{selectedRetailer.value.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Percentage</span>
                  <p className="text-lg font-semibold text-gray-900">{selectedRetailer.percentage.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Product Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Top Products
            </h3>
            
            {/* Toggle Chart Type Button for Products */}
            <button 
              onClick={toggleChartView}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {chartView === 'pie' ? (
                <>
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" />
                    <path d="M8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4z" />
                    <path d="M14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  Bar Chart
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.5A1.5 1.5 0 017.5 7h-1A1.5 1.5 0 015 5.5V5a1 1 0 00-2 0v.5A3.5 3.5 0 006.5 9h1a3.5 3.5 0 003.5-3.5V5a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Pie Chart
                </>
              )}
            </button>
          </div>
          
          {productDistribution && productDistribution.length > 0 ? (
            <>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={productDistribution.slice(0, 10).map(item => ({
                          ...item,
                          name: item.displayName
                        }))}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        innerRadius={60}
                        paddingAngle={2}
                        onMouseEnter={(data, index) => setActiveProduct(index)}
                        onMouseLeave={() => setActiveProduct(null)}
                        onClick={(data) => handleProductClick(data)}
                        label={({ name, percent }) => 
                          percent > 0.05 ? `${name.length > 15 ? name.substring(0, 15) + '...' : name}: ${(percent * 100).toFixed(1)}%` : ''
                        }
                        labelLine={false}
                      >
                        {productDistribution.slice(0, 10).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                            stroke="#fff"
                            strokeWidth={1}
                            style={{
                              opacity: activeProduct === null || activeProduct === index ? 1 : 0.6,
                              filter: activeProduct === index ? 'drop-shadow(0px 0px 4px rgba(0,0,0,0.2))' : 'none',
                              transition: 'opacity 300ms, filter 300ms',
                              cursor: 'pointer'
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ paddingLeft: '30px' }}
                        iconType="circle"
                        onMouseEnter={(data, index) => setActiveProduct(index)}
                        onMouseLeave={() => setActiveProduct(null)}
                        onClick={(data, index) => handleProductClick(productDistribution[index])}
                        formatter={(value, entry, index) => (
                          <span 
                            className={`text-sm ${activeProduct === index ? 'font-bold text-gray-900' : 'text-gray-600'}`}
                            style={{ cursor: 'pointer' }}
                          >
                            {value.length > 20 ? value.substring(0, 20) + '...' : value}
                          </span>
                        )}
                      />
                    </PieChart>
                  ) : (
                    <BarChart
                      data={productDistribution.slice(0, 10)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="displayName" 
                        type="category" 
                        width={150}
                        tick={{
                          fontSize: 12
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar 
                        dataKey="count" 
                        name="Units" 
                        fill="#FF0066"
                        onClick={(data) => handleProductClick(data)}
                        style={{ cursor: 'pointer' }}
                      >
                        {productDistribution.slice(0, 10).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                            opacity={selectedProduct && selectedProduct.displayName !== entry.displayName ? 0.7 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 overflow-auto max-h-64">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productDistribution.slice(0, 10).map((product, index) => (
                      <tr 
                        key={index} 
                        className={`hover:bg-gray-50 ${selectedProduct && selectedProduct.displayName === product.displayName ? 'bg-pink-50' : ''}`}
                        onClick={() => handleProductClick(product)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <div className="text-sm font-medium text-gray-900">{product.displayName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{product.count.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{product.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Selected Product Details */}
              {selectedProduct && (
                <div className="mt-4 p-4 bg-pink-50 rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-md font-medium text-pink-800">Product: {selectedProduct.displayName}</h4>
                    <button 
                      onClick={() => setSelectedProduct(null)}
                      className="text-pink-500 hover:text-pink-700"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Units</span>
                      <p className="text-lg font-semibold text-gray-900">{selectedProduct.count.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Percentage</span>
                      <p className="text-lg font-semibold text-gray-900">{selectedProduct.percentage.toFixed(1)}%</p>
                    </div>
                    {selectedProduct.category && (
                      <div className="col-span-2">
                        <span className="text-sm text-gray-600">Category</span>
                        <p className="text-md text-gray-900">{selectedProduct.category}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500">No product data available</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Redemptions Over Time */}
      {redemptionsOverTime && redemptionsOverTime.length > 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4 sm:mb-0">
              <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Redemptions Over Time
            </h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
                <select
                  value={redemptionTimeframe}
                  onChange={(e) => setRedemptionTimeframe(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={showTrendLine}
                    onChange={(e) => setShowTrendLine(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-4 w-4"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show Trend Line</span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={redemptionsOverTime}
                margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
              >
                <defs>
                  <linearGradient id="colorRedemptions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF0066" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FF0066" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  name="Redemptions" 
                  fill="url(#colorRedemptions)" 
                  stroke="#FF0066" 
                  strokeWidth={2} 
                  dot={{ stroke: '#FF0066', strokeWidth: 2, r: 4, fill: 'white' }}
                  activeDot={{ stroke: '#FF0066', strokeWidth: 2, r: 6, fill: 'white' }}
                />
                {showTrendLine && trendLineData && trendLineData.some(Boolean) && (
                  <Line
                    type="monotone"
                    dataKey="trend"
                    data={trendLineData}
                    name="Trend (7-day MA)"
                    stroke="#0066CC"
                    strokeWidth={2}
                    dot={false}
                    activeDot={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8 flex justify-center items-center h-64">
          <p className="text-gray-500">No time series data available</p>
        </div>
      )}
    </div>
  );
};

export default SalesTab;