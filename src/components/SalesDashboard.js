import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver'; // Make sure to install this: npm install file-saver
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import DemographicInsights from './DemographicInsights';
import OfferInsights from './OfferInsights';

// Define the preferred sorting order for age groups (for PDF export)
const AGE_GROUP_ORDER = [
  '16-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
  'Under 18'
];

const SalesDashboard = () => {
  const [data, setData] = useState([]);
  const [offerData, setOfferData] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(['all']);
  const [selectedRetailers, setSelectedRetailers] = useState(['all']);
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('sales');
  const [hasOfferData, setHasOfferData] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Refs for child components to access their data
  const demographicRef = useRef(null);
  const offerInsightsRef = useRef(null);

  // Add effect to handle clicking outside the export dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportOptions && !event.target.closest('.export-dropdown')) {
        setShowExportOptions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportOptions]);

  // Generate colors for responses/age groups - Shopmium branded colors with better contrast
  const COLORS = ['#FF0066', '#0066CC', '#FFC107', '#00ACC1', '#9C27B0', '#4CAF50', '#FF9800'];

  // Handle product selection
  const handleProductSelection = (product) => {
    if (product === 'all') {
      setSelectedProducts(['all']);
    } else {
      const newSelection = selectedProducts.includes('all') 
        ? [product]
        : selectedProducts.includes(product)
          ? selectedProducts.filter(p => p !== product)
          : [...selectedProducts, product];
      
      setSelectedProducts(newSelection.length ? newSelection : ['all']);
    }
  };

  // Handle file upload for either sales or offer data
  const handleFileUpload = (event) => {
    setLoading(true);
    setError('');
    const file = event.target.files[0];
    
    if (file) {
      // Check file type based on name
      const isOfferData = file.name.toLowerCase().includes('hits_offer');
      
      // Reset previous data if switching file types
      if (isOfferData) {
        // If uploading offer data
        if (data.length > 0 && !hasOfferData) {
          // Keep sales data if already loaded, just add offer data
        } else {
          // Clear sales data if we're only working with offer data
          setData([]);
        }
      } else {
        // If uploading sales data, clear offer data
        setOfferData([]);
        setHasOfferData(false);
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        Papa.parse(e.target.result, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              if (isOfferData) {
                // Process offer data
                const validOfferData = results.data.filter(row => 
                  row.hit_id && row.offer_id
                );
                
                if (validOfferData.length === 0) {
                  setError('No valid offer data found. Please ensure your CSV has the correct format.');
                } else {
                  setOfferData(validOfferData);
                  setHasOfferData(true);
                  // Set active tab to offers if this is the first upload
                  setActiveTab('offers');
                }
              } else {
                // Process sales data
                const validData = results.data.filter(row => 
                  row.receipt_date && 
                  row.product_name &&
                  row.chain &&
                  !isNaN(new Date(row.receipt_date).getTime())
                );
  
                if (validData.length === 0) {
                  setError('No valid sales data found. Please ensure your CSV has the correct format.');
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
                  // Set initial date range
                  const dates = processedData.map(row => row.receipt_date);
                  setStartDate(_.min(dates));
                  setEndDate(_.max(dates));
                  // Initialize with all products selected
                  setSelectedProducts(['all']);
                  
                  // Always set active tab to sales when uploading sales data
                  setActiveTab('sales');
                }
              }
            } else {
              setError('No data found in file');
            }
            setLoading(false);
          },
          error: (error) => {
            setError('Error parsing file: ' + error.message);
            setLoading(false);
          }
        });
      };
      reader.onerror = () => {
        setError('Error reading file');
        setLoading(false);
      };
      reader.readAsText(file);
    } else {
      setError('Please select a file');
      setLoading(false);
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
      const productMatch = selectedProducts.includes('all') || selectedProducts.includes(item.product_name);
      
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

  // Export to CSV function - Enhanced to export dashboard view data
  const exportToCSV = (fileName) => {
    let csvData = [];
    let headers = [];
    
    // Format data based on active tab
    if (activeTab === 'sales') {
      // Get retailer distribution data
      const distribution = retailerData;
      headers = ['Retailer', 'Units', 'Percentage'];
      
      // Format for CSV
      csvData = distribution.map(item => ({
        Retailer: item.name,
        Units: item.value,
        Percentage: `${item.percentage.toFixed(1)}%`
      }));
    } 
    else if (activeTab === 'demographics') {
      // For demographic insights, get age and gender distribution
      if (demographicRef.current) {
        // Get currently selected question data
        const { responseData, selectedResponses, ageDistribution } = demographicRef.current.getVisibleData();
        
        if (selectedResponses.length > 0 && ageDistribution.length > 0) {
          // Age distribution by response
          headers = ['Age Group', 'Total Count', ...selectedResponses];
          
          csvData = ageDistribution.map(row => {
            const rowData = {
              'Age Group': row.ageGroup,
              'Total Count': row.count
            };
            
            // Add each selected response
            selectedResponses.forEach(response => {
              rowData[response] = row[response] || 0;
            });
            
            return rowData;
          });
        } else {
          // Just export responses
          headers = ['Response', 'Count', 'Percentage'];
          
          csvData = responseData.map(item => ({
            'Response': item.response,
            'Count': item.total,
            'Percentage': `${Math.round(item.percentage)}%`
          }));
        }
      } else {
        // Fallback to basic data
        csvData = data;
        headers = Object.keys(data[0] || {});
      }
    }
    else if (activeTab === 'offers') {
      // For offer insights, format based on the current insight type in the component
      if (offerInsightsRef.current) {
        const { insightType, metrics, offerData, genderData, ageData, timeData, rankData } = offerInsightsRef.current.getVisibleData();
        
        switch (insightType) {
          case 'metrics':
            // Key metrics and offer comparison
            if (offerData.length > 0) {
              headers = ['Offer', 'Total Hits', 'Avg Hits/Day', 'Share (%)'];
              
              csvData = offerData.map(item => ({
                'Offer': item.name,
                'Total Hits': item.value,
                'Avg Hits/Day': item.averageHitsPerDay,
                'Share (%)': `${item.percentage.toFixed(1)}%`
              }));
            }
            break;
            
          case 'demographic':
            // Export both gender and age data with clear separation
            if (genderData.length > 0) {
              headers = ['Category', 'Group', 'Count', 'Percentage'];
              
              // Add gender data
              const genderRows = genderData.map(item => ({
                'Category': 'Gender',
                'Group': item.name,
                'Count': item.value,
                'Percentage': `${item.percentage.toFixed(1)}%`
              }));
              
              // Add age data
              const ageRows = ageData.map(item => ({
                'Category': 'Age Group',
                'Group': item.name,
                'Count': item.value,
                'Percentage': `${item.percentage.toFixed(1)}%`
              }));
              
              csvData = [...genderRows, ...ageRows];
            }
            break;
            
          case 'time':
            // Export hour and day distribution
            if (timeData) {
              const { hourData, dayData } = timeData;
              headers = ['Type', 'Period', 'Count'];
              
              // Add hour data
              const hourRows = hourData.map(item => ({
                'Type': 'Hour of Day',
                'Period': item.name,
                'Count': item.value
              }));
              
              // Add day data
              const dayRows = dayData.map(item => ({
                'Type': 'Day of Week',
                'Period': item.name,
                'Count': item.value
              }));
              
              csvData = [...hourRows, ...dayRows];
            }
            break;
            
          case 'rank':
            // Export rank distribution
            headers = ['Rank', 'Count', 'Percentage'];
            
            csvData = rankData.map(item => ({
              'Rank': item.name,
              'Count': item.value,
              'Percentage': `${item.percentage.toFixed(1)}%`
            }));
            break;
            
          case 'trends':
            // Export trend data
            if (timeData && timeData.trendData) {
              headers = ['Date', 'Hit Count'];
              
              csvData = timeData.trendData.map(item => ({
                'Date': item.date,
                'Hit Count': item.count
              }));
            }
            break;
            
          default:
            // Fallback to basic data
            csvData = offerData.length > 0 ? offerData : offerData;
            headers = Object.keys(csvData[0] || {});
            break;
        }
      } else {
        // Fallback to raw data if we can't access the component
        csvData = offerData;
        headers = Object.keys(offerData[0] || {});
      }
    }
    
    // If no data matches current view, show error and return
    if (!csvData.length) {
      alert('No data available to export for the current view.');
      return;
    }
    
    // Generate CSV using Papa Parse
    const csv = Papa.unparse({
      fields: headers,
      data: csvData
    });
    
    // Create a blob and save the file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${fileName || 'data-export'}.csv`);
  };

  // Handle which type of export to run
  const handleExport = (type) => {
    const exportName = clientName 
      ? `${clientName.toLowerCase().replace(/\s+/g, '-')}-${activeTab}`
      : `${activeTab}-data`;
      
    if (type === 'csv') {
      exportToCSV(exportName);
    } else if (type === 'pdf') {
      generatePDF(exportName);
    }
  };

  // Generate PDF report
  const generatePDF = (fileName) => {
    // Create new PDF document
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Add client name and header
    doc.setFontSize(20);
    doc.text(`${clientName || 'Analysis'} Report`, 15, 20);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, 30);
    
    // Add sales data if available
    if (data.length > 0 && (activeTab === 'sales' || activeTab === 'demographics')) {
      // Add filters section
      doc.setFontSize(12);
      doc.text('Sales Data - Applied Filters:', 15, 40);
      doc.setFontSize(10);
      doc.text(`Products: ${selectedProducts.includes('all') ? 'All Products' : selectedProducts.join(', ')}`, 20, 47);
      doc.text(`Date Range: ${dateRange}`, 20, 54);
      if (dateRange === 'month') {
        doc.text(`Month: ${selectedMonth}`, 20, 61);
      }
      if (dateRange === 'custom') {
        doc.text(`Period: ${startDate} to ${endDate}`, 20, 61);
      }
      
      // Add retailer metrics
      doc.setFontSize(12);
      doc.text('Sales Distribution Summary:', 15, 75);
      doc.setFontSize(14);
      doc.setTextColor(255, 0, 102); // Shopmium pink
      doc.text(`Total Units: ${metrics?.totalUnits.toLocaleString()}`, 20, 82);
      doc.setTextColor(0, 0, 0);

      // Add retailer distribution table
      doc.setFontSize(12);
      doc.text('Retailer Distribution:', 15, 95);
      
      const tableData = retailerData.map(retailer => [
        retailer.name,
        retailer.value.toLocaleString(),
        `${retailer.percentage.toFixed(1)}%`
      ]);
      
      doc.autoTable({
        startY: 100,
        head: [['Retailer', 'Units', 'Percentage']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [255, 0, 102] }, // Shopmium pink
        styles: { fontSize: 10 },
        margin: { left: 15 }
      });

      // Add demographic data for demographics tab
      if (activeTab === 'demographics' && demographicRef.current) {
        const { responseData, selectedResponses, ageDistribution, getCurrentQuestionText } = demographicRef.current.getVisibleData();
        
        // Add a new page
        doc.addPage();
        
        // Add demographic header
        doc.setFontSize(16);
        doc.text('Demographic Insights', 15, 20);
        
        // Add question text
        doc.setFontSize(12);
        doc.text(`Question: ${getCurrentQuestionText}`, 15, 30);
        
        // Add response summary table
        doc.setFontSize(12);
        doc.text('Response Summary:', 15, 40);
        
        const responseTableData = responseData.map(item => [
          item.response,
          item.total.toLocaleString(),
          `${Math.round(item.percentage)}%`
        ]);
        
        doc.autoTable({
          startY: 45,
          head: [['Response', 'Count', 'Percentage']],
          body: responseTableData,
          theme: 'grid',
          headStyles: { fillColor: [255, 0, 102] },
          styles: { fontSize: 10 },
          margin: { left: 15 }
        });
        
        // If age distribution available, add that too
        if (selectedResponses.length > 0 && ageDistribution.length > 0) {
          const tableTop = doc.autoTable.previous.finalY + 10;
          doc.setFontSize(12);
          doc.text(`Age Distribution for Selected Responses:`, 15, tableTop);
          
          // Create header row with each selected response
          const ageHeader = ['Age Group', 'Total Count', ...selectedResponses];
          
          // Create table data with each response value
          const ageTableData = ageDistribution.map(row => {
            const rowData = [
              row.ageGroup,
              row.count
            ];
            
            // Add data for each selected response
            selectedResponses.forEach(response => {
              rowData.push(row[response] || 0);
            });
            
            return rowData;
          });
          
          doc.autoTable({
            startY: tableTop + 5,
            head: [ageHeader],
            body: ageTableData,
            theme: 'grid',
            headStyles: { fillColor: [255, 0, 102] },
            styles: { fontSize: 10 },
            margin: { left: 15 }
          });
        }
      }
    }
    
    // Add offer data if available
    if (hasOfferData && offerData.length > 0 && activeTab === 'offers') {
      // Add a new page for offer insights if we already output sales data
      if (data.length > 0 && activeTab !== 'offers') {
        doc.addPage();
      }
      
      // Get data from the OfferInsights component if available
      if (offerInsightsRef.current) {
        const { 
          insightType, 
          metrics, 
          offerData, 
          genderData, 
          ageData, 
          timeData, 
          rankData, 
          selectedOffers, 
          excludeFirstDays, 
          excludeLastDays 
        } = offerInsightsRef.current.getVisibleData();
        
        doc.setFontSize(16);
        doc.text('Offer Insights', 15, 20);
        
        // Add exclusion information if applicable
        if (excludeFirstDays || excludeLastDays) {
          doc.setFontSize(10);
          let exclusionText = "Exclusions: ";
          if (excludeFirstDays) {
            exclusionText += "First 7 days excluded";
          }
          if (excludeFirstDays && excludeLastDays) {
            exclusionText += ", ";
          }
          if (excludeLastDays) {
            exclusionText += "Last 3 days excluded";
          }
          doc.text(exclusionText, 15, 27);
        }
        
        doc.setFontSize(12);
        
        // PDF content based on current insight type
        switch (insightType) {
          case 'metrics':
            // Key metrics
            doc.text('Key Metrics:', 15, 35);
            
            doc.autoTable({
              startY: 40,
              head: [['Metric', 'Value']],
              body: [
                ['Total Hits', metrics.totalHits.toLocaleString()],
                ['Period Length', `${metrics.periodDays} days`],
                ['Average Hits per Day', metrics.averageHitsPerDay]
              ],
              theme: 'grid',
              headStyles: { fillColor: [255, 0, 102] },
              styles: { fontSize: 10 },
              margin: { left: 15 }
            });
            
            // Offer comparison table
            if (offerData.length > 0) {
              const tableTop = doc.autoTable.previous.finalY + 10;
              doc.text('Offer Performance Comparison:', 15, tableTop);
              
              const offerTableData = offerData.map(item => [
                item.name,
                item.value.toLocaleString(),
                item.averageHitsPerDay,
                `${item.percentage.toFixed(1)}%`
              ]);
              
              doc.autoTable({
                startY: tableTop + 5,
                head: [['Offer', 'Total Hits', 'Avg Hits/Day', 'Share (%)']],
                body: offerTableData,
                theme: 'grid',
                headStyles: { fillColor: [255, 0, 102] },
                styles: { fontSize: 10 },
                margin: { left: 15 }
              });
            }
            break;
            
          case 'demographic':
            // Gender distribution
            if (genderData.length > 0) {
              doc.text('Gender Distribution:', 15, 35);
              
              const genderTableData = genderData.map(item => [
                item.name,
                item.value.toLocaleString(),
                `${item.percentage.toFixed(1)}%`
              ]);
              
              doc.autoTable({
                startY: 40,
                head: [['Gender', 'Count', 'Percentage']],
                body: genderTableData,
                theme: 'grid',
                headStyles: { fillColor: [255, 0, 102] },
                styles: { fontSize: 10 },
                margin: { left: 15 }
              });
            }
            
            // Age group distribution
            if (ageData.length > 0) {
              const tableTop = doc.autoTable.previous.finalY + 10;
              doc.text('Age Group Distribution:', 15, tableTop);
              
              const ageTableData = ageData.map(item => [
                item.name,
                item.value.toLocaleString(),
                `${item.percentage.toFixed(1)}%`
              ]);
              
              doc.autoTable({
                startY: tableTop + 5,
                head: [['Age Group', 'Count', 'Percentage']],
                body: ageTableData,
                theme: 'grid',
                headStyles: { fillColor: [255, 0, 102] },
                styles: { fontSize: 10 },
                margin: { left: 15 }
              });
            }
            break;
            
          case 'time':
            // Hour distribution
            if (timeData && timeData.hourData) {
              doc.text('Hour of Day Distribution:', 15, 35);
              
              const hourTableData = timeData.hourData.map(item => [
                item.name,
                item.value.toLocaleString()
              ]);
              
              doc.autoTable({
                startY: 40,
                head: [['Hour', 'Count']],
                body: hourTableData,
                theme: 'grid',
                headStyles: { fillColor: [255, 0, 102] },
                styles: { fontSize: 10 },
                margin: { left: 15 }
              });
            }
            
            // Day of week distribution
            if (timeData && timeData.dayData) {
              const tableTop = doc.autoTable.previous.finalY + 10;
              doc.text('Day of Week Distribution:', 15, tableTop);
              
              const dayTableData = timeData.dayData.map(item => [
                item.name,
                item.value.toLocaleString()
              ]);
              
              doc.autoTable({
                startY: tableTop + 5,
                head: [['Day', 'Count']],
                body: dayTableData,
                theme: 'grid',
                headStyles: { fillColor: [255, 0, 102] },
                styles: { fontSize: 10 },
                margin: { left: 15 }
              });
            }
            break;
            
          case 'rank':
            // Rank distribution
            if (rankData && rankData.length > 0) {
              doc.text('Rank Distribution:', 15, 35);
              
              const rankTableData = rankData.map(item => [
                item.name,
                item.value.toLocaleString(),
                `${item.percentage.toFixed(1)}%`
              ]);
              
              doc.autoTable({
                startY: 40,
                head: [['Rank', 'Count', 'Percentage']],
                body: rankTableData,
                theme: 'grid',
                headStyles: { fillColor: [255, 0, 102] },
                styles: { fontSize: 10 },
                margin: { left: 15 }
              });
            }
            break;
            
          case 'trends':
            // Daily trends summary
            doc.text('Daily Hit Trends Summary:', 15, 35);
            
            doc.autoTable({
              startY: 40,
              head: [['Metric', 'Value']],
              body: [
                ['Total Hits', metrics.totalHits.toLocaleString()],
                ['Period Length', `${metrics.periodDays} days`],
                ['Average Hits per Day', metrics.averageHitsPerDay]
              ],
              theme: 'grid',
              headStyles: { fillColor: [255, 0, 102] },
              styles: { fontSize: 10 },
              margin: { left: 15 }
            });
            
            // We can't easily represent the trend chart in PDF, so we just provide summary
            break;
            
          default:
            // Default to overall offer data
            doc.text('Top Offers by Hit Count:', 15, 35);
            
            const offerTableData = offerData.slice(0, 10).map(item => [
              item.name,
              item.value.toLocaleString(),
              `${item.percentage.toFixed(1)}%`
            ]);
            
            doc.autoTable({
              startY: 40,
              head: [['Offer Name', 'Hits', 'Percentage']],
              body: offerTableData,
              theme: 'grid',
              headStyles: { fillColor: [255, 0, 102] },
              styles: { fontSize: 10 },
              margin: { left: 15 }
            });
            break;
        }
      } else {
        // Fallback if component ref not available
        doc.setFontSize(16);
        doc.text('Offer Insights', 15, 20);
        
        // Top offers by count
        const offerGroups = _.groupBy(offerData, 'offer_name');
        const offerList = Object.entries(offerGroups)
          .filter(([name]) => name) // Filter out undefined names
          .map(([name, items]) => ({
            name,
            count: items.length,
            percentage: (items.length / offerData.length) * 100
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        
        doc.setFontSize(12);
        doc.text('Top 10 Offers by Hit Count:', 15, 30);
        
        const offerTableData = offerList.map(item => [
          item.name,
          item.count.toLocaleString(),
          `${item.percentage.toFixed(1)}%`
        ]);
        
        doc.autoTable({
          startY: 35,
          head: [['Offer Name', 'Hits', 'Percentage']],
          body: offerTableData,
          theme: 'grid',
          headStyles: { fillColor: [255, 0, 102] },
          styles: { fontSize: 10 },
          margin: { left: 15 }
        });
        
        // Demographics 
        if (offerData.some(item => item.age_group)) {
          // Age groups
          const ageGroups = _.groupBy(
            offerData.filter(item => item.age_group),
            'age_group'
          );
          
          const ageTableData = Object.entries(ageGroups)
            .map(([age, items]) => [
              age,
              items.length.toLocaleString(),
              `${((items.length / offerData.filter(item => item.age_group).length) * 100).toFixed(1)}%`
            ])
            .sort((a, b) => {
              const aIndex = AGE_GROUP_ORDER.indexOf(a[0]);
              const bIndex = AGE_GROUP_ORDER.indexOf(b[0]);
              return (aIndex !== -1 ? aIndex : 999) - (bIndex !== -1 ? bIndex : 999);
            });
          
          const tableTop = doc.autoTable.previous.finalY + 10;
          doc.setFontSize(12);
          doc.text('Age Group Distribution:', 15, tableTop);
          
          doc.autoTable({
            startY: tableTop + 5,
            head: [['Age Group', 'Count', 'Percentage']],
            body: ageTableData,
            theme: 'grid',
            headStyles: { fillColor: [255, 0, 102] },
            styles: { fontSize: 10 },
            margin: { left: 15 }
          });
        }
      }
    }
    
    // Save the PDF
    doc.save(`${fileName || 'analysis-report'}.pdf`);
  };

  const metrics = calculateMetrics();
  const retailerData = getRetailerDistribution();
  const availableRetailers = _.uniq(data.map(item => item.chain)).sort();

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header with Export Buttons */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Insights Analysis Dashboard</h1>
          <p className="text-gray-600">
            Please upload an items_purchased.CSV file for sales data or hits_offer_9001.CSV for offer insights
          </p>
        </div>
        {(data.length > 0 || offerData.length > 0) && (
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Enter Client Name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-pink-200 focus:border-pink-500 outline-none"
            />
            <div className="relative export-dropdown">
              <button
                onClick={() => setShowExportOptions(!showExportOptions)}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors shadow-md flex items-center"
              >
                <span>Export</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              
              {showExportOptions && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleExport('pdf');
                        setShowExportOptions(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors"
                    >
                      Export as PDF
                    </button>
                    <button
                      onClick={() => {
                        handleExport('csv');
                        setShowExportOptions(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors"
                    >
                      Export as CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* File Upload */}
      <div className="mb-6 p-4 bg-white rounded-xl shadow-md">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100 transition-colors"
        />
        {loading && <p className="mt-2 text-pink-600">Loading data...</p>}
        {error && <p className="mt-2 text-red-600">{error}</p>}
      </div>

      {/* Tab Navigation */}
      {(data.length > 0 || hasOfferData) && (
        <>
          {/* Tabs Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex">
              {data.length > 0 && (
                <>
                  <button
                    onClick={() => setActiveTab('sales')}
                    className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                      activeTab === 'sales'
                        ? 'border-pink-500 text-pink-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Sales Analysis
                  </button>
                  <button
                    onClick={() => setActiveTab('demographics')}
                    className={`ml-8 py-2 px-4 text-center border-b-2 font-medium text-sm ${
                      activeTab === 'demographics'
                        ? 'border-pink-500 text-pink-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Demographic Insights
                  </button>
                </>
              )}
              {hasOfferData && (
                <button
                  onClick={() => setActiveTab('offers')}
                  className={`${data.length > 0 ? 'ml-8' : ''} py-2 px-4 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'offers'
                      ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Offer Insights
                </button>
              )}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'sales' && data.length > 0 && (
            <>
              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-white rounded-xl shadow-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Products</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <button
                      onClick={() => handleProductSelection('all')}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedProducts.includes('all')
                          ? 'bg-pink-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      All Products
                    </button>
                    {_.uniq(data.map(item => item.product_name)).sort().map(product => (
                      <button
                        key={product}
                        onClick={() => handleProductSelection(product)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          selectedProducts.includes(product) && !selectedProducts.includes('all')
                            ? 'bg-pink-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {product.length > 30 ? product.substring(0, 30) + '...' : product}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl shadow-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="block w-full p-2 border border-gray-300 rounded-lg focus:ring focus:ring-pink-200 focus:border-pink-500 outline-none mb-2"
                  >
                    <option value="all">All Time</option>
                    <option value="month">Specific Month</option>
                    <option value="custom">Custom Range</option>
                  </select>

                  {dateRange === 'month' && (
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="block w-full p-2 border border-gray-300 rounded-lg focus:ring focus:ring-pink-200 focus:border-pink-500 outline-none"
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
                        className="block w-full p-2 border border-gray-300 rounded-lg focus:ring focus:ring-pink-200 focus:border-pink-500 outline-none"
                      />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="block w-full p-2 border border-gray-300 rounded-lg focus:ring focus:ring-pink-200 focus:border-pink-500 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Retailer Selection */}
              <div className="mb-6 p-4 bg-white rounded-xl shadow-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Retailers</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleRetailerSelection('all')}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedRetailers.includes('all')
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All Retailers
                  </button>
                  {availableRetailers.map(retailer => (
                    <button
                      key={retailer}
                      onClick={() => handleRetailerSelection(retailer)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedRetailers.includes(retailer) && !selectedRetailers.includes('all')
                          ? 'bg-pink-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                  <div className="p-4 bg-white rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-gray-700">Total Units</h3>
                    <p className="text-2xl font-bold text-pink-600">{metrics.totalUnits.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Distribution Chart and Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="p-4 bg-white rounded-xl shadow-md">
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
                          fill="#FF0066"
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
                <div className="p-4 bg-white rounded-xl shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Detailed Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-pink-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Retailer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Units</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Percentage</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {retailerData.map((retailer, idx) => (
                          <tr 
                            key={retailer.name} 
                            className="transition-colors hover:bg-pink-50 cursor-pointer"
                            style={{ borderLeft: `4px solid ${COLORS[idx % COLORS.length]}` }}
                          >
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

          {/* Demographics Tab */}
          {activeTab === 'demographics' && data.length > 0 && (
            <DemographicInsights ref={demographicRef} data={data} />
          )}

          {/* Offer Insights Tab */}
          {activeTab === 'offers' && hasOfferData && (
            <OfferInsights ref={offerInsightsRef} data={offerData} />
          )}
        </>
      )}
    </div>
  );
};

export default SalesDashboard;