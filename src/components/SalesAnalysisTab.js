import React, { useState } from 'react';
import _ from 'lodash';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line, 
  Area, AreaChart
} from 'recharts';

const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    // Format as DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return dateString;
  }
};

// Shopmium primary color with contrasting colors
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

const SalesAnalysisTab = ({
  data,
  metrics,
  comparisonMode,
  comparisonMetrics,
  retailerData,
  redemptionsOverTime,
  redemptionTimeframe,
  setRedemptionTimeframe,
  showTrendLine,
  setShowTrendLine,
  getProductDistribution,
  calculateTrendLine,
  selectedProducts
}) => {
  // State for controlling detailed views
  // Fix: Add expandedSection state with default to 'matrix' (always expanded)
  const [expandedSection, setExpandedSection] = useState('matrix'); 
  const [activeRetailer, setActiveRetailer] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  
  // Fix: Add dummy toggleSection function that does nothing
  const toggleSection = () => {
    // Function kept for compatibility, but no longer toggles
    return;
  };
  
  // Helper function to calculate the percentage change between two values
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  // Get product distribution data
  const productDistribution = getProductDistribution();
  
  return (
    <div>
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
              {!comparisonMode ? (
                <p className="text-3xl font-bold text-pink-600">{metrics?.totalUnits.toLocaleString()}</p>
              ) : (
                <div>
                  <div className="flex justify-between items-center">
                    <p className="text-2xl font-bold text-pink-600">{metrics?.totalUnits.toLocaleString()}</p>
                    <div className="text-xs font-medium text-pink-700 px-2 py-1 rounded-full bg-pink-50">Primary</div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xl font-bold text-pink-500">{comparisonMetrics?.totalUnits.toLocaleString()}</p>
                    <div className="text-xs font-medium text-pink-500 px-2 py-1 rounded-full bg-pink-50">Comparison</div>
                  </div>
                  {comparisonMetrics && (
                    <div className={`mt-2 text-sm font-medium flex items-center ${calculateChange(metrics?.totalUnits, comparisonMetrics?.totalUnits) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {calculateChange(metrics?.totalUnits, comparisonMetrics?.totalUnits) >= 0 ? (
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                        </svg>
                      )}
                      {Math.abs(calculateChange(metrics?.totalUnits, comparisonMetrics?.totalUnits)).toFixed(1)}%
                    </div>
                  )}
                </div>
              )}
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
              {!comparisonMode ? (
                <p className="text-3xl font-bold text-blue-600">{metrics?.avgRedemptionsPerDay}</p>
              ) : (
                <div>
                  <div className="flex justify-between items-center">
                    <p className="text-2xl font-bold text-blue-600">{metrics?.avgRedemptionsPerDay}</p>
                    <div className="text-xs font-medium text-blue-700 px-2 py-1 rounded-full bg-blue-50">Primary</div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xl font-bold text-blue-500">{comparisonMetrics?.avgRedemptionsPerDay}</p>
                    <div className="text-xs font-medium text-blue-500 px-2 py-1 rounded-full bg-blue-50">Comparison</div>
                  </div>
                  {comparisonMetrics && (
                    <div className={`mt-2 text-sm font-medium flex items-center ${calculateChange(parseFloat(metrics?.avgRedemptionsPerDay), parseFloat(comparisonMetrics?.avgRedemptionsPerDay)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {calculateChange(parseFloat(metrics?.avgRedemptionsPerDay), parseFloat(comparisonMetrics?.avgRedemptionsPerDay)) >= 0 ? (
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                        </svg>
                      )}
                      {Math.abs(calculateChange(parseFloat(metrics?.avgRedemptionsPerDay), parseFloat(comparisonMetrics?.avgRedemptionsPerDay))).toFixed(1)}%
                    </div>
                  )}
                </div>
              )}
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
              {!comparisonMode ? (
                <div>
                  <p className="text-sm text-gray-600 font-medium">{formatDate(metrics?.uniqueDates[0])} to {formatDate(metrics?.uniqueDates[metrics.uniqueDates.length - 1])}</p>
                  <p className="text-gray-600 text-sm">{metrics?.daysInRange} days</p>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">{formatDate(metrics?.uniqueDates[0])} to {formatDate(metrics?.uniqueDates[metrics.uniqueDates.length - 1])}</p>
                      <p className="text-gray-600 text-xs">{metrics?.daysInRange} days</p>
                    </div>
                    <div className="text-xs font-medium text-green-700 px-2 py-1 rounded-full bg-green-50">Primary</div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">{formatDate(comparisonMetrics?.uniqueDates[0])} to {formatDate(comparisonMetrics?.uniqueDates[comparisonMetrics.uniqueDates.length - 1])}</p>
                      <p className="text-gray-600 text-xs">{comparisonMetrics?.daysInRange} days</p>
                    </div>
                    <div className="text-xs font-medium text-green-500 px-2 py-1 rounded-full bg-green-50">Comparison</div>
                  </div>
                </div>
              )}
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
            {/* Fix: Hide the button with className="hidden" */}
            <button 
              onClick={() => toggleSection('retailers')}
              className="hidden text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center focus:outline-none"
            >
              Details
              <svg 
                className="w-4 h-4 ml-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {/* Fix: Set fixed height */}
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
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
                        transition: 'opacity 300ms, filter 300ms'
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
                  formatter={(value, entry, index) => (
                    <span className={`text-sm ${activeRetailer === index ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Fix: Always show the table */}
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
                  <tr key={index} className="hover:bg-gray-50">
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
            {/* Fix: Hide the button with className="hidden" */}
            <button 
              onClick={() => toggleSection('products')}
              className="hidden text-sm text-pink-600 hover:text-pink-800 font-medium flex items-center focus:outline-none"
            >
              Details
              <svg 
                className="w-4 h-4 ml-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {/* Fix: Set fixed height */}
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
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
                        transition: 'opacity 300ms, filter 300ms'
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
                  formatter={(value, entry, index) => (
                    <span className={`text-sm ${activeProduct === index ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                      {value.length > 20 ? value.substring(0, 20) + '...' : value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Fix: Always show the table */}
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
                  <tr key={index} className="hover:bg-gray-50">
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
        </div>
      </div>
      
      {/* Redemptions Over Time */}
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
              {showTrendLine && calculateTrendLine(redemptionsOverTime).some(Boolean) && (
                <Line
                  type="monotone"
                  dataKey="trend"
                  data={calculateTrendLine(redemptionsOverTime)}
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
      
      {/* Product x Retailer Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Product/Retailer Distribution
          </h3>
        </div>
        
        {/* Fix: Remove expandedSection conditional and make this always visible with a class */}
        <div className="max-h-96 overflow-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                      Product / Retailer
                    </th>
                    {retailerData.slice(0, 5).map((retailer, index) => (
                      <th key={index} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {retailer.name}
                      </th>
                    ))}
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productDistribution.slice(0, 6).map((product, productIndex) => (
                    <tr key={productIndex} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[productIndex % COLORS.length] }}></div>
                          {product.displayName}
                        </div>
                      </td>
                      {retailerData.slice(0, 5).map((retailer, retailerIndex) => {
                        // Fix: Use data instead of filteredData
                        const productItems = data.filter(item => item.product_name === product.name);
                        const productRetailerItems = productItems.filter(item => item.chain === retailer.name);
                        const percentage = productItems.length > 0 
                          ? (productRetailerItems.length / productItems.length) * 100 
                          : 0;
                        
                        const intensity = Math.min(0.9, 0.1 + (percentage / 100) * 0.8);
                        
                        return (
                          <td 
                            key={retailerIndex} 
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
                            style={{ 
                              backgroundColor: `rgba(${COLORS[productIndex % COLORS.length].slice(1).match(/.{1,2}/g).map(hex => parseInt(hex, 16)).join(', ')}, ${intensity})`
                            }}
                          >
                            {percentage.toFixed(1)}%
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center border-l border-gray-200">
                        {product.count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                      Total
                    </td>
                    {retailerData.slice(0, 5).map((retailer, index) => (
                      <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {retailer.value.toLocaleString()}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center border-l border-gray-200">
                      {metrics?.totalUnits.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesAnalysisTab;