import React from 'react';
import { formatDate } from '../../utils/exportUtils';
import { useTheme } from '../../context/ThemeContext';

const PageTitle = ({ 
  activeTab, 
  brandNames, 
  clientName, 
  metrics 
}) => {
  const { darkMode } = useTheme();

  return (
    <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {activeTab === 'summary' && 'Executive Summary'}
            {activeTab === 'sales' && 'Sales Analysis'}
            {activeTab === 'demographics' && 'Demographics'}
            {activeTab === 'offers' && 'Offer Insights'}
          </h1>
          <div className="mt-1 flex items-center flex-wrap">
            {brandNames.length > 0 && (
              <>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Brand: <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{brandNames.join(', ')}</span>
                </div>
                <span className="mx-2 text-gray-300">•</span>
              </>
            )}

            {clientName && (
              <>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Client: <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{clientName}</span>
                </div>
                <span className="mx-2 text-gray-300">•</span>
              </>
            )}
              
            {metrics && metrics.uniqueDates && metrics.uniqueDates.length > 0 && (
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Date range: <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                  {formatDate(metrics.uniqueDates[0])} to {formatDate(metrics.uniqueDates[metrics.uniqueDates.length - 1])}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageTitle;