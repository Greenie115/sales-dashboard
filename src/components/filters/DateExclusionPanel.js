// src/components/filters/DateExclusionPanel.js
import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const DateExclusionPanel = ({ excludedDates, onAddDate, onRemoveExcludedDate }) => {
  const { darkMode } = useTheme();
  const [datePickerValue, setDatePickerValue] = useState('');
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return dateString;
    }
  };
  
  return (
    <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
      <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
        Exclude Dates from Chart
      </h3>
      <p className={`text-xs mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        Select specific dates to exclude from the redemptions over time chart.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="flex-grow">
          <input
            type="date"
            value={datePickerValue}
            onChange={(e) => setDatePickerValue(e.target.value)}
            className={`w-full px-3 py-2 border ${
              darkMode 
                ? 'bg-gray-600 border-gray-500 text-white focus:ring-pink-500 focus:border-pink-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500'
            } rounded-md text-sm focus:outline-none`}
          />
        </div>
        <button
          onClick={() => {
            if (datePickerValue) {
              onAddDate(datePickerValue);
              setDatePickerValue('');
            }
          }}
          disabled={!datePickerValue}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            !datePickerValue
              ? `${darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`
              : `${darkMode ? 'bg-pink-600 text-white hover:bg-pink-700' : 'bg-pink-600 text-white hover:bg-pink-700'}`
          }`}
        >
          Add Excluded Date
        </button>
      </div>
      
      {excludedDates.length > 0 ? (
        <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h4 className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Currently Excluded Dates:
          </h4>
          <div className="max-h-40 overflow-y-auto">
            {excludedDates.map(date => (
              <div key={date} className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {formatDate(date)}
                </span>
                <button
                  onClick={() => onRemoveExcludedDate(date)}
                  className={`p-1 rounded-full ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-100'}`}
                  title="Remove exclusion"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={`mt-3 text-sm italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          No dates excluded. The chart will display all available data points.
        </div>
      )}
    </div>
  );
};

export default DateExclusionPanel;