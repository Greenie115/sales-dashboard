// src/utils/exportUtils.js
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  filterSalesData,
  getRetailerDistribution,
  calculateMetrics
} from './dataProcessing';

/**
 * Get comparison data for export when in comparison mode
 * @param {Object} campaigns - Campaign data
 * @param {Object} comparisonSettings - Comparison settings
 * @param {Object} filterState - Current filter state
 * @param {string} activeTab - Active tab type
 * @returns {Object|null} Processed comparison data or null
 */
export const getComparisonDataForExport = (campaigns, comparisonSettings, filterState, activeTab) => {
  if (!campaigns || !comparisonSettings || comparisonSettings.mode !== 'campaigns') {
    return null;
  }
  
  const primaryDataset = comparisonSettings.primaryDataset || 'A';
  const comparisonDataset = primaryDataset === 'A' ? 'B' : 'A';
  
  const comparisonRawData = campaigns[comparisonDataset]?.data || [];
  if (!comparisonRawData.length) return null;
  
  // Filter the comparison data using the same filters
  const filteredComparisonData = filterSalesData(comparisonRawData, filterState);
  if (!filteredComparisonData.length) return null;
  
  // Process data based on active tab
  if (activeTab === 'summary' || activeTab === 'sales') {
    const comparisonRetailerData = getRetailerDistribution(filteredComparisonData);
    
    // Calculate product distribution for comparison
    const productCounts = {};
    filteredComparisonData.forEach(item => {
      const productName = item.product_name || 'Unknown Product';
      productCounts[productName] = (productCounts[productName] || 0) + 1;
    });
    
    const comparisonProductDistribution = Object.entries(productCounts)
      .map(([name, count]) => ({
        displayName: name,
        count,
        percentage: (count / filteredComparisonData.length) * 100
      }))
      .sort((a, b) => b.count - a.count);
    
    return {
      comparisonRetailerData,
      comparisonProductDistribution,
      comparisonMetrics: calculateMetrics(filteredComparisonData)
    };
  }
  
  // For other tabs, return the raw filtered data for now
  return {
    comparisonData: filteredComparisonData
  };
};

/**
 * Export data to CSV
 */
export const exportToCSV = (data, activeTab, fileName, comparisonContext = null) => {
  try {
    // Determine which data to export based on active tab
    if (activeTab === 'summary' || activeTab === 'sales') {
      // Export sales data
      exportSalesDataToCSV(data, fileName, comparisonContext);
    } else if (activeTab === 'demographics') {
      // Export demographic data
      exportDemographicDataToCSV(data, fileName, comparisonContext);
    } else if (activeTab === 'offers') {
      // Export offer data
      exportOfferDataToCSV(data, fileName, comparisonContext);
    } else {
      throw new Error(`Unsupported tab type: ${activeTab}`);
    }
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw new Error(`Unable to export CSV: ${error.message || 'Unknown error'}. Please check your data and try again.`);
  }
};

/**
 * Export data to PDF
 */
export const exportToPDF = (data, activeTab, fileName, comparisonContext = null) => {
  try {
    // Determine which data to export based on active tab
    if (activeTab === 'summary' || activeTab === 'sales') {
      // Export sales data
      exportSalesDataToPDF(data, fileName, comparisonContext);
    } else if (activeTab === 'demographics') {
      // Export demographic data
      exportDemographicDataToPDF(data, fileName, comparisonContext);
    } else if (activeTab === 'offers') {
      // Export offer data
      exportOfferDataToPDF(data, fileName, comparisonContext);
    } else {
      throw new Error(`Unsupported tab type: ${activeTab}`);
    }
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw new Error(`Unable to export PDF: ${error.message || 'Unknown error'}. Please check your data and try again.`);
  }
};

/**
 * Export sales data to CSV
 */
const exportSalesDataToCSV = (data, fileName, comparisonContext = null) => {
  // Extract what we need from the data object
  const { retailerData, productDistribution } = data;
  
  // Begin building CSV content
  let csvContent = 'Sales Analysis Report\n\n';
  
  // Add comparison context if available
  if (comparisonContext && comparisonContext.isComparison) {
    csvContent += `Campaign Comparison Mode\n`;
    csvContent += `Primary Dataset: ${comparisonContext.primaryName || 'Campaign A'}\n`;
    csvContent += `Comparison Dataset: ${comparisonContext.comparisonName || 'Campaign B'}\n\n`;
  }
  
  // Add retailer distribution data
  if (retailerData && retailerData.length > 0) {
    csvContent += 'Retailer Distribution\n';
    csvContent += 'Retailer,Units,Percentage\n';
    
    retailerData.forEach(item => {
      const row = [
        `"${item.name}"`,
        item.value,
        `${(item.percentage || 0).toFixed(1)}%`
      ];
      csvContent += row.join(',') + '\n';
    });
    
    csvContent += '\n';
  }
  
  // Add product distribution data
  if (productDistribution && productDistribution.length > 0) {
    csvContent += 'Product Distribution\n';
    csvContent += 'Product,Units,Percentage\n';
    
    productDistribution.forEach(item => {
      const row = [
        `"${item.displayName}"`,
        item.count,
        `${(item.percentage || 0).toFixed(1)}%`
      ];
      csvContent += row.join(',') + '\n';
    });
  }
  
  // Add comparison data if available
  if (comparisonContext && comparisonContext.comparisonData) {
    const { comparisonRetailerData, comparisonProductDistribution } = comparisonContext.comparisonData;
    
    csvContent += '\n\n=== COMPARISON DATA ===\n\n';
    
    // Add comparison retailer data
    if (comparisonRetailerData && comparisonRetailerData.length > 0) {
      csvContent += `${comparisonContext.comparisonName || 'Campaign B'} - Retailer Distribution\n`;
      csvContent += 'Retailer,Units,Percentage\n';
      
      comparisonRetailerData.forEach(item => {
        const row = [
          `"${item.name}"`,
          item.value,
          `${(item.percentage || 0).toFixed(1)}%`
        ];
        csvContent += row.join(',') + '\n';
      });
      
      csvContent += '\n';
    }
    
    // Add comparison product data
    if (comparisonProductDistribution && comparisonProductDistribution.length > 0) {
      csvContent += `${comparisonContext.comparisonName || 'Campaign B'} - Product Distribution\n`;
      csvContent += 'Product,Units,Percentage\n';
      
      comparisonProductDistribution.forEach(item => {
        const row = [
          `"${item.displayName}"`,
          item.count,
          `${(item.percentage || 0).toFixed(1)}%`
        ];
        csvContent += row.join(',') + '\n';
      });
    }
  }
  
  // Create and download the CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${fileName}.csv`);
};

/**
 * Export demographic data to CSV
 */
const exportDemographicDataToCSV = (data, fileName, comparisonContext = null) => {
  // Check if we have demographic data to export
  if (!data) {
    throw new Error('No demographic data available to export. Please ensure your data is loaded and try again.');
  }
  
  let csvContent = 'Demographics Analysis Report\n\n';
  
  // Add comparison context if available
  if (comparisonContext && comparisonContext.isComparison) {
    csvContent += `Campaign Comparison Mode\n`;
    csvContent += `Primary Dataset: ${comparisonContext.primaryName || 'Campaign A'}\n`;
    csvContent += `Comparison Dataset: ${comparisonContext.comparisonName || 'Campaign B'}\n\n`;
  }
  
  // Add question information if available
  if (data.questionNumber && data.questionText) {
    csvContent += `Question ${parseInt(data.questionNumber)}: ${data.questionText}\n\n`;
  }
  
  // Export product ratings if available
  if (data.productRatings && data.productRatings.length > 0) {
    csvContent += 'Product Ratings\n';
    csvContent += 'Product,Average Rating,Responses\n';
    
    data.productRatings.forEach(item => {
      const productName = `"${item.displayName.replace(/"/g, '""')}"`;
      csvContent += `${productName},${(item.avgRating || 0).toFixed(2)},${item.ratingResponses}\n`;
    });
    
    csvContent += '\n';
  }
  
  // Export repurchase intent if available
  if (data.repurchaseIntent && data.repurchaseIntent.length > 0) {
    csvContent += 'Repurchase Intent\n';
    csvContent += 'Product,Intent %,Responses\n';
    
    data.repurchaseIntent.forEach(item => {
      const productName = `"${item.displayName.replace(/"/g, '""')}"`;
      csvContent += `${productName},${(item.repurchaseIntentRate || 0).toFixed(1)}%,${item.repurchaseResponses}\n`;
    });
    
    csvContent += '\n';
  }
  
  // Add response data if available
  if (data.responses && data.responses.length > 0) {
    csvContent += 'Response Analysis\n';
    csvContent += 'Response,Count,Percentage\n';
    
    data.responses.forEach(item => {
      const formattedResponse = `"${item.fullResponse.replace(/"/g, '""')}"`;
      csvContent += `${formattedResponse},${item.count},${item.percentage}%\n`;
    });
    
    csvContent += '\n';
  }
  
  // Add gender breakdown if available
  if (data.genderBreakdown && data.genderBreakdown.length > 0) {
    csvContent += 'Gender Breakdown\n';
    csvContent += 'Gender,Count,Percentage\n';
    
    const total = data.genderBreakdown.reduce((sum, item) => sum + item.value, 0);
    data.genderBreakdown.forEach(item => {
      const percentage = total > 0 ? (item.value / total * 100).toFixed(1) : "0.0";
      csvContent += `"${item.name}",${item.value},${percentage}%\n`;
    });
    
    csvContent += '\n';
  }
  
  // Add age breakdown if available
  if (data.ageBreakdown && data.ageBreakdown.length > 0) {
    csvContent += 'Age Breakdown\n';
    csvContent += 'Age Group,Count,Percentage\n';
    
    const total = data.ageBreakdown.reduce((sum, item) => sum + item.value, 0);
    data.ageBreakdown.forEach(item => {
      const percentage = total > 0 ? (item.value / total * 100).toFixed(1) : "0.0";
      csvContent += `"${item.name}",${item.value},${percentage}%\n`;
    });
  }
  
  // Create and download the CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${fileName}.csv`);
};

/**
 * Export offer data to CSV
 */
const exportOfferDataToCSV = (data, fileName, comparisonContext = null) => {
  if (!data) {
    throw new Error('No offer data available to export. Please ensure your data is loaded and try again.');
  }
  
  try {
    let csvContent = 'Offer Analysis Report\n\n';
    
    // Add comparison context if available
    if (comparisonContext && comparisonContext.isComparison) {
      csvContent += `Campaign Comparison Mode\n`;
      csvContent += `Primary Dataset: ${comparisonContext.primaryName || 'Campaign A'}\n`;
      csvContent += `Comparison Dataset: ${comparisonContext.comparisonName || 'Campaign B'}\n\n`;
    }
    
    // Add offer metrics if available
    if (data.metrics) {
      csvContent += 'Offer Metrics\n';
      csvContent += `Total Hits,${data.metrics.totalHits}\n`;
      csvContent += `Average Hits Per Day,${data.metrics.avgHitsPerDay}\n`;
      csvContent += `Date Range,${data.metrics.dateRange}\n\n`;
    }
    
    // Add offer distribution data
    if (data.offerData && data.offerData.length > 0) {
      csvContent += 'Offer Distribution\n';
      csvContent += 'Offer,Hits,Percentage\n';
      
      data.offerData.forEach(item => {
        const formattedOfferName = `"${item.name.replace(/"/g, '""')}"`;
        csvContent += `${formattedOfferName},${item.value},${(item.percentage || 0).toFixed(1)}%\n`;
      });
    }
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${fileName}.csv`);
  } catch (error) {
    console.error('Error exporting offer data to CSV:', error);
    throw new Error(`Unable to export offer data to CSV: ${error.message || 'Unknown error'}. Please try again.`);
  }
};

/**
 * Export sales data to PDF
 */
const exportSalesDataToPDF = (data, fileName, comparisonContext = null) => {
  try {
    const { retailerData, productDistribution } = data;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Sales Analysis Report', 14, 22);
    
    // Add date and comparison context
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    let yPosition = 40;
    
    // Add comparison context if available
    if (comparisonContext && comparisonContext.isComparison) {
      doc.setFontSize(10);
      doc.text(`Campaign Comparison Mode`, 14, yPosition);
      doc.text(`Primary: ${comparisonContext.primaryName || 'Campaign A'}`, 14, yPosition + 5);
      doc.text(`Comparison: ${comparisonContext.comparisonName || 'Campaign B'}`, 14, yPosition + 10);
      yPosition += 20;
    }
    
    // Add comparison data tables if available
    if (comparisonContext && comparisonContext.comparisonData) {
      const { comparisonRetailerData, comparisonProductDistribution } = comparisonContext.comparisonData;
      
      // Add comparison retailer distribution table
      if (comparisonRetailerData && comparisonRetailerData.length > 0) {
        // Check if we need a new page
        if (yPosition > 180) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text(`${comparisonContext.comparisonName || 'Campaign B'} - Retailer Distribution`, 14, yPosition);
        yPosition += 10;
        
        const comparisonRetailerTableData = comparisonRetailerData.map(item => [
          item.name,
          item.value.toString(),
          `${(item.percentage || 0).toFixed(1)}%`
        ]);
        
        doc.autoTable({
          startY: yPosition,
          head: [['Retailer', 'Units', 'Percentage']],
          body: comparisonRetailerTableData,
          theme: 'striped',
          headStyles: { fillColor: [0, 102, 204] }
        });
        
        yPosition = doc.lastAutoTable.finalY + 20;
      }
      
      // Add comparison product distribution table
      if (comparisonProductDistribution && comparisonProductDistribution.length > 0) {
        // Check if we need a new page
        if (yPosition > 180) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text(`${comparisonContext.comparisonName || 'Campaign B'} - Product Distribution`, 14, yPosition);
        yPosition += 10;
        
        const comparisonProductTableData = comparisonProductDistribution.slice(0, 10).map(item => [
          item.displayName,
          item.count.toString(),
          `${(item.percentage || 0).toFixed(1)}%`
        ]);
        
        doc.autoTable({
          startY: yPosition,
          head: [['Product', 'Units', 'Percentage']],
          body: comparisonProductTableData,
          theme: 'striped',
          headStyles: { fillColor: [0, 102, 204] }
        });
      }
    }
    
    // Add retailer distribution table
    if (retailerData && retailerData.length > 0) {
      doc.setFontSize(14);
      doc.text('Retailer Distribution', 14, yPosition);
      yPosition += 10;
      
      const retailerTableData = retailerData.map(item => [
        item.name,
        item.value.toString(),
        `${(item.percentage || 0).toFixed(1)}%`
      ]);
      
      doc.autoTable({
        startY: yPosition,
        head: [['Retailer', 'Units', 'Percentage']],
        body: retailerTableData,
        theme: 'striped',
        headStyles: { fillColor: [255, 0, 102] }
      });
      
      yPosition = doc.lastAutoTable.finalY + 20;
    }
    
    // Add product distribution table
    if (productDistribution && productDistribution.length > 0) {
      doc.setFontSize(14);
      doc.text('Product Distribution', 14, yPosition);
      yPosition += 10;
      
      const productTableData = productDistribution.slice(0, 10).map(item => [
        item.displayName,
        item.count.toString(),
        `${(item.percentage || 0).toFixed(1)}%`
      ]);
      
      doc.autoTable({
        startY: yPosition,
        head: [['Product', 'Units', 'Percentage']],
        body: productTableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 102, 204] }
      });
    }
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount} - Generated by Sales Dashboard`, 14, doc.internal.pageSize.height - 10);
    }
    
    // Save the PDF
    doc.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Error exporting sales data to PDF:', error);
    throw new Error(`Unable to export sales data to PDF: ${error.message || 'Unknown error'}. Please try again.`);
  }
};

/**
 * Export demographic data to PDF
 */
const exportDemographicDataToPDF = (data, fileName, comparisonContext = null) => {
  try {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Demographics Analysis Report', 14, 22);
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    let yPosition = 40;
    
    // Add question information if available
    if (data.questionNumber && data.questionText) {
      doc.setFontSize(14);
      doc.text(`Question ${parseInt(data.questionNumber)}: ${data.questionText}`, 14, yPosition);
      yPosition += 20;
    }
    
    // Add product ratings table
    if (data.productRatings && data.productRatings.length > 0) {
      doc.setFontSize(14);
      doc.text('Product Ratings', 14, yPosition);
      yPosition += 10;
      
      const ratingsTableData = data.productRatings.map(item => [
        item.displayName,
        (item.avgRating || 0).toFixed(2),
        item.ratingResponses.toString()
      ]);
      
      doc.autoTable({
        startY: yPosition,
        head: [['Product', 'Avg Rating', 'Responses']],
        body: ratingsTableData,
        theme: 'striped',
        headStyles: { fillColor: [255, 193, 7] }
      });
      
      yPosition = doc.lastAutoTable.finalY + 20;
    }
    
    // Add repurchase intent table
    if (data.repurchaseIntent && data.repurchaseIntent.length > 0) {
      doc.setFontSize(14);
      doc.text('Repurchase Intent', 14, yPosition);
      yPosition += 10;
      
      const intentTableData = data.repurchaseIntent.map(item => [
        item.displayName,
        `${(item.repurchaseIntentRate || 0).toFixed(1)}%`,
        item.repurchaseResponses.toString()
      ]);
      
      doc.autoTable({
        startY: yPosition,
        head: [['Product', 'Intent %', 'Responses']],
        body: intentTableData,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }
      });
      
      yPosition = doc.lastAutoTable.finalY + 20;
    }
    
    // Add response data
    if (data.responses && data.responses.length > 0) {
      // Check if we need to start a new page for the response table
      if (yPosition > 180) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Response Analysis', 14, yPosition);
      yPosition += 10;
      
      const responseTableData = data.responses.map(item => [
        item.fullResponse,
        item.count.toString(),
        `${item.percentage}%`
      ]);
      
      doc.autoTable({
        startY: yPosition,
        head: [['Response', 'Count', 'Percentage']],
        body: responseTableData,
        theme: 'striped',
        headStyles: { fillColor: [156, 39, 176] }
      });
      
      yPosition = doc.lastAutoTable.finalY + 20;
    }
    
    // Add gender breakdown table
    if (data.genderBreakdown && data.genderBreakdown.length > 0) {
      // Check if we need to start a new page
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Gender Breakdown', 14, yPosition);
      yPosition += 10;
      
      const total = data.genderBreakdown.reduce((sum, item) => sum + item.value, 0);
      const genderTableData = data.genderBreakdown.map(item => [
        item.name,
        item.value.toString(),
        `${total > 0 ? (item.value / total * 100).toFixed(1) : "0.0"}%`
      ]);
      
      doc.autoTable({
        startY: yPosition,
        head: [['Gender', 'Count', 'Percentage']],
        body: genderTableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 102, 204] }
      });
      
      yPosition = doc.lastAutoTable.finalY + 20;
    }
    
    // Add age breakdown table
    if (data.ageBreakdown && data.ageBreakdown.length > 0) {
      // Check if we need to start a new page
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Age Breakdown', 14, yPosition);
      yPosition += 10;
      
      const total = data.ageBreakdown.reduce((sum, item) => sum + item.value, 0);
      const ageTableData = data.ageBreakdown.map(item => [
        item.name,
        item.value.toString(),
        `${total > 0 ? (item.value / total * 100).toFixed(1) : "0.0"}%`
      ]);
      
      doc.autoTable({
        startY: yPosition,
        head: [['Age Group', 'Count', 'Percentage']],
        body: ageTableData,
        theme: 'striped',
        headStyles: { fillColor: [255, 0, 102] }
      });
    }
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount} - Generated by Sales Dashboard`, 14, doc.internal.pageSize.height - 10);
    }
    
    // Save the PDF
    doc.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Error exporting demographic data to PDF:', error);
    throw new Error(`Unable to export demographic data to PDF: ${error.message || 'Unknown error'}. Please try again.`);
  }
};

/**
 * Export offer data to PDF
 */
const exportOfferDataToPDF = (data, fileName, comparisonContext = null) => {
  try {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Offer Analysis Report', 14, 22);
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    let yPosition = 40;
    
    // Add offer metrics
    if (data.metrics) {
      doc.setFontSize(14);
      doc.text('Offer Metrics', 14, yPosition);
      yPosition += 10;
      
      const metricsData = [
        ['Total Hits', data.metrics.totalHits.toString()],
        ['Average Hits Per Day', data.metrics.avgHitsPerDay.toString()],
        ['Date Range', data.metrics.dateRange]
      ];
      
      doc.autoTable({
        startY: yPosition,
        body: metricsData,
        theme: 'striped',
        styles: { cellPadding: 5 }
      });
      
      yPosition = doc.lastAutoTable.finalY + 20;
    }
    
    // Add offer distribution table
    if (data.offerData && data.offerData.length > 0) {
      doc.setFontSize(14);
      doc.text('Offer Distribution', 14, yPosition);
      yPosition += 10;
      
      const offerTableData = data.offerData.map(item => [
        item.name,
        item.value.toString(),
        `${(item.percentage || 0).toFixed(1)}%`
      ]);
      
      doc.autoTable({
        startY: yPosition,
        head: [['Offer', 'Hits', 'Percentage']],
        body: offerTableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 102, 204] }
      });
    }
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount} - Generated by Sales Dashboard`, 14, doc.internal.pageSize.height - 10);
    }
    
    // Save the PDF
    doc.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Error exporting offer data to PDF:', error);
    throw new Error(`Unable to export offer data to PDF: ${error.message || 'Unknown error'}. Please try again.`);
  }
};