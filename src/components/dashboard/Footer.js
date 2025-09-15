// src/components/dashboard/Footer.js
import React, { useState } from 'react';
import { HelpTooltip } from '../common/Tooltip';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [showHelp, setShowHelp] = useState(false);
  
  const showHelpModal = () => {
    setShowHelp(true);
  };
  
  const hideHelpModal = () => {
    setShowHelp(false);
  };
  
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center space-x-6 md:order-2">
          <HelpTooltip content="Get help with using the dashboard features and interpreting your data">
            <button 
              onClick={showHelpModal}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              <span className="sr-only">Help</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </HelpTooltip>
          <HelpTooltip content="Quick access to dashboard keyboard shortcuts and tips">
            <button className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
              <span className="sr-only">Shortcuts</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          </HelpTooltip>
        </div>
        <div className="mt-8 md:mt-0 md:order-1">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {currentYear} Insights Dashboard. All rights reserved.
          </p>
        </div>
      </div>
      
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard Help</h3>
              <button
                onClick={hideHelpModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <section>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Getting Started</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Upload your CSV file using the drag & drop area or browse button</li>
                  <li>• Supported formats: CSV files with sales or offer data</li>
                  <li>• Maximum file size: 50MB</li>
                </ul>
              </section>
              
              <section>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Analysis Modes</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• <strong>Single:</strong> Analyze one dataset with comprehensive metrics</li>
                  <li>• <strong>Compare:</strong> Side-by-side comparison of two campaigns</li>
                  <li>• <strong>Years:</strong> Year-over-year analysis of the same dataset</li>
                </ul>
              </section>
              
              <section>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Filters</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Filter by products, retailers, and date ranges</li>
                  <li>• Use "Compare Periods" to analyze different time frames</li>
                  <li>• All filters apply across all tabs and charts</li>
                </ul>
              </section>
              
              <section>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Exporting Data</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Export charts and data as CSV or PDF</li>
                  <li>• Use the export buttons in each tab</li>
                  <li>• Exports include your current filter selections</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;