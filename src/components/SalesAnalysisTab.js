import React from 'react';
import _ from 'lodash';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line 
} from 'recharts';

// Shopmium primary color with contrasting colors
const COLORS = ['#FF0066', '#0066CC', '#FFC107', '#00ACC1', '#9C27B0', '#4CAF50', '#FF9800', '#607D8B', '#673AB7', '#3F51B5'];

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
  // Helper function to calculate the percentage change between two values
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };
  
  return (
    <div>
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-pink-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-1">Total Redemptions</h3>
          {!comparisonMode ? (
            <p className="text-3xl font-bold text-pink-600">{metrics?.totalUnits.toLocaleString()}</p>
          ) : (
            <div>
              <div className="flex justify-between items-center">
                <p className="text-2xl font-bold text-pink-600">{metrics?.totalUnits.toLocaleString()}</p>
                <div className="text-sm font-medium text-pink-700 px-1">Primary</div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xl font-bold text-pink-500">{comparisonMetrics?.totalUnits.toLocaleString()}</p>
                <div className="text-sm font-medium text-pink-500 px-1">Comparison</div>
              </div>
              {comparisonMetrics && (
                <div className={`mt-2 text-sm font-medium ${calculateChange(metrics?.totalUnits, comparisonMetrics?.totalUnits) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {calculateChange(metrics?.totalUnits, comparisonMetrics?.totalUnits) >= 0 ? '↑' : '↓'} 
                  {Math.abs(calculateChange(metrics?.totalUnits, comparisonMetrics?.totalUnits)).toFixed(1)}%
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-pink-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-1">Average Per Day</h3>
          {!comparisonMode ? (
            <p className="text-3xl font-bold text-pink-600">{metrics?.avgRedemptionsPerDay}</p>
          ) : (
            <div>
              <div className="flex justify-between items-center">
                <p className="text-2xl font-bold text-pink-600">{metrics?.avgRedemptionsPerDay}</p>
                <div className="text-sm font-medium text-pink-700 px-1">Primary</div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xl font-bold text-pink-500">{comparisonMetrics?.avgRedemptionsPerDay}</p>
                <div className="text-sm font-medium text-pink-500 px-1">Comparison</div>
              </div>
              {comparisonMetrics && (
                <div className={`mt-2 text-sm font-medium ${calculateChange(parseFloat(metrics?.avgRedemptionsPerDay), parseFloat(comparisonMetrics?.avgRedemptionsPerDay)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {calculateChange(parseFloat(metrics?.avgRedemptionsPerDay), parseFloat(comparisonMetrics?.avgRedemptionsPerDay)) >= 0 ? '↑' : '↓'} 
                  {Math.abs(calculateChange(parseFloat(metrics?.avgRedemptionsPerDay), parseFloat(comparisonMetrics?.avgRedemptionsPerDay))).toFixed(1)}%
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-pink-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-1">Date Range</h3>
          {!comparisonMode ? (
            <div>
              <p className="text-sm text-gray-600">{metrics?.uniqueDates[0]} to {metrics?.uniqueDates[metrics.uniqueDates.length - 1]}</p>
              <p className="text-gray-600 text-sm">({metrics?.daysInRange} days)</p>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">{metrics?.uniqueDates[0]} to {metrics?.uniqueDates[metrics.uniqueDates.length - 1]}</p>
                  <p className="text-gray-600 text-sm">({metrics?.daysInRange} days)</p>
                </div>
                <div className="text-sm font-medium text-pink-700 px-1">Primary</div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">{comparisonMetrics?.uniqueDates[0]} to {comparisonMetrics?.uniqueDates[comparisonMetrics.uniqueDates.length - 1]}</p>
                  <p className="text-gray-600 text-sm">({comparisonMetrics?.daysInRange} days)</p>
                </div>
                <div className="text-sm font-medium text-pink-500 px-1">Comparison</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Retailer and Product Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Retailer Distribution */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Retailer Distribution</h3>
          <div className="min-h-80">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={retailerData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                >
                  {retailerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4">
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Retailer</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Units</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Percentage</th>
                  </tr>
                </thead>
              </table>
              <div className="overflow-y-auto" style={{ maxHeight: retailerData.length > 5 ? '250px' : 'auto' }}>
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="bg-white divide-y divide-gray-200">
                    {retailerData.map((retailer, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{retailer.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{retailer.value.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{retailer.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        
        {/* Product Distribution */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Products</h3>
          <div className="min-h-80">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getProductDistribution().slice(0, 10).map(item => ({
                    ...item,
                    name: item.displayName
                  }))}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => 
                    `${name.length > 20 ? name.substring(0, 20) + '...' : name}: ${(percent * 100).toFixed(1)}%`
                  }
                >
                  {getProductDistribution().slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4">
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Product</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Units</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Percentage</th>
                  </tr>
                </thead>
              </table>
              <div className="overflow-y-auto" style={{ maxHeight: getProductDistribution().length > 5 ? '250px' : 'auto' }}>
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getProductDistribution().slice(0, 10).map((product, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.displayName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.count.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Redemptions Over Time */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Redemptions Over Time</h3>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
              <select
                value={redemptionTimeframe}
                onChange={(e) => setRedemptionTimeframe(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md shadow-sm"
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
                  className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={70}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#FF0066" name="Redemptions" />
              {showTrendLine && calculateTrendLine(redemptionsOverTime).some(Boolean) && (
                <Line
                  dataKey="trend"
                  data={calculateTrendLine(redemptionsOverTime)}
                  name="Trend (7-day MA)"
                  stroke="#0066CC"
                  dot={false}
                  activeDot={false}
                  strokeWidth={2}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SalesAnalysisTab;