import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import _ from 'lodash';

const SalesDashboard = () => {
  const [data, setData] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedRetailers, setSelectedRetailers] = useState(['all']);
  const [dateRange, setDateRange] = useState('all'); // 'all', 'month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (event) => {
    setLoading(true);
    setError('');
    const file = event.target.files[0];
    
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          Papa.parse(e.target.result, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.data && results.data.length > 0) {
                const validData = results.data.filter(row => 
                  row.receipt_date && 
                  row.product_name &&
                  row.chain &&
                  !isNaN(new Date(row.receipt_date).getTime())
                );

                if (validData.length === 0) {
                  setError('No valid data found. Please ensure your CSV has the correct format.');
                  setData([]);
                } else {
                  // Process dates and add month field
                  const processedData = validData.map(row => {
                    const date = new Date(row.receipt_date);
                    return {
                      ...row,
                      receipt_date: date.toISOString().split('T')[0],
                      month: date.toISOString().slice(0, 7) // YYYY-MM format
                    };
                  });
                  
                  setData(processedData);
                  // Set initial dates
                  const dates = processedData.map(row => row.receipt_date);
                  setStartDate(_.min(dates));
                  setEndDate(_.max(dates));
                  // Set initial product
                  const products = _.uniq(processedData.map(row => row.product_name));
                  setSelectedProduct(products[0] || 'all');
                }
              } else {
                setError('No data found in file');
                setData([]);
              }
              setLoading(false);
            },
            error: (error) => {
              setError('Error parsing file: ' + error.message);
              setLoading(false);
            }
          });
        };
        reader.readAsText(file);
      } catch (error) {
        setError('Error reading file: ' + error.message);
        setLoading(false);
      }
    }
  };

  // Handle retailer selection
  const handleRetailerSelection = (retailer) => {
    if (retailer === 'all') {
      setSelectedRetailers(['all']);
    } else {
      const newSelection = selectedRetailers.includes('all') 
        ? [retailer]
        : selectedRetailers.includes(retailer)
          ? selectedRetailers.filter(r => r !== retailer)
          : [...selectedRetailers, retailer];
      
      setSelectedRetailers(newSelection.length ? newSelection : ['all']);
    }
  };

  // Get filtered data based on all selections
  const getFilteredData = () => {
    return data.filter(item => {
      // Product filter
      const productMatch = selectedProduct === 'all' || item.product_name === selectedProduct;
      
      // Retailer filter
      const retailerMatch = selectedRetailers.includes('all') || selectedRetailers.includes(item.chain);
      
      // Date filter
      let dateMatch = true;
      if (dateRange === 'month') {
        dateMatch = item.month === selectedMonth;
      } else if (dateRange === 'custom') {
        dateMatch = item.receipt_date >= startDate && item.receipt_date <= endDate;
      }
      
      return productMatch && retailerMatch && dateMatch;
    });
  };

  // Calculate metrics for the filtered data
  const calculateMetrics = () => {
    if (!data.length) return null;
    
    const filteredData = getFilteredData();
    return {
      totalUnits: filteredData.length
    };
  };

  // Get retailer distribution data
  const getRetailerDistribution = () => {
    const filteredData = getFilteredData();
    const groupedByRetailer = _.groupBy(filteredData, 'chain');
    
    const totalUnits = filteredData.length;
    
    return Object.entries(groupedByRetailer)
      .map(([chain, items]) => ({
        name: chain || 'Unknown',
        value: items.length,
        percentage: (items.length / totalUnits) * 100
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Get available months from data
  const getAvailableMonths = () => {
    return _.uniq(data.map(item => item.month)).sort();
  };

  const metrics = calculateMetrics();
  const retailerData = getRetailerDistribution();
  const availableRetailers = _.uniq(data.map(item => item.chain)).sort();

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Unit Sales Analysis</h1>
        <p className="text-gray-600">Analyze unit sales by product and retailer</p>
      </div>

      {/* File Upload */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {loading && <p className="mt-2 text-blue-600">Loading data...</p>}
        {error && <p className="mt-2 text-red-600">{error}</p>}
      </div>

      {data.length > 0 && (
        <>
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-white rounded-lg shadow">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Product</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="block w-full p-2 border rounded"
              >
                <option value="all">All Products</option>
                {_.uniq(data.map(item => item.product_name)).sort().map(product => (
                  <option key={product} value={product}>{product}</option>
                ))}
              </select>
            </div>

            <div className="p-4 bg-white rounded-lg shadow">
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="block w-full p-2 border rounded mb-2"
              >
                <option value="all">All Time</option>
                <option value="month">Specific Month</option>
                <option value="custom">Custom Range</option>
              </select>

              {dateRange === 'month' && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="block w-full p-2 border rounded"
                >
                  {getAvailableMonths().map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              )}

              {dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full p-2 border rounded"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="block w-full p-2 border rounded"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Retailer Selection */}
          <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Retailers</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleRetailerSelection('all')}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedRetailers.includes('all')
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                All Retailers
              </button>
              {availableRetailers.map(retailer => (
                <button
                  key={retailer}
                  onClick={() => handleRetailerSelection(retailer)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedRetailers.includes(retailer) && !selectedRetailers.includes('all')
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {retailer}
                </button>
              ))}
            </div>
          </div>

          {/* Metrics Cards */}
          {metrics && (
            <div className="mb-6">
              <div className="p-4 bg-white rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700">Total Units</h3>
                <p className="text-2xl font-bold text-blue-600">{metrics.totalUnits.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Distribution Chart and Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Unit Sales Distribution</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={retailerData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {retailerData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Detailed Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retailer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {retailerData.map((retailer, idx) => (
                      <tr key={retailer.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
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
        </>
      )}
    </div>
  );
};

export default SalesDashboard;