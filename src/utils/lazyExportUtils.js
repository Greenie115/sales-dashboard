// src/utils/lazyExportUtils.js
/**
 * Lazy-loaded export utilities that dynamically import heavy dependencies
 * only when export functionality is needed
 */

/**
 * Dynamically import and execute CSV export
 */
export const exportToCSVLazy = async (data, activeTab, fileName) => {
  try {
    const { exportToCSV } = await import('./exportUtils');
    return exportToCSV(data, activeTab, fileName);
  } catch (error) {
    console.error('Error loading CSV export module:', error);
    throw new Error('Failed to load CSV export functionality');
  }
};

/**
 * Dynamically import and execute PDF export
 */
export const exportToPDFLazy = async (data, activeTab, fileName) => {
  try {
    // Dynamic import of the export utilities which includes jsPDF
    const { exportToPDF } = await import('./exportUtils');
    return exportToPDF(data, activeTab, fileName);
  } catch (error) {
    console.error('Error loading PDF export module:', error);
    throw new Error('Failed to load PDF export functionality');
  }
};

/**
 * Generic export function that handles both CSV and PDF exports
 */
export const exportData = async (type, data, activeTab, fileName) => {
  if (type === 'csv') {
    return await exportToCSVLazy(data, activeTab, fileName);
  } else if (type === 'pdf') {
    return await exportToPDFLazy(data, activeTab, fileName);
  } else {
    throw new Error(`Unsupported export type: ${type}`);
  }
};