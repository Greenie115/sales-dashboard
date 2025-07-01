// src/components/validation/ValidationReport.js
import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Component to display CSV validation results with detailed error reporting
 */
const ValidationReport = ({ validationResult, onAccept, onReject, isProcessing = false }) => {
  const { darkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('summary');
  
  if (!validationResult) return null;

  const { isValid, errors, warnings, stats } = validationResult;
  const hasIssues = errors.length > 0 || warnings.length > 0;

  return (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              CSV Validation Report
            </h3>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isValid 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {isValid ? 'Valid' : 'Invalid'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <nav className="flex -mb-px">
          {['summary', 'errors', 'warnings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-6 text-sm font-medium border-b-2 ${
                activeTab === tab
                  ? `border-pink-500 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`
                  : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'errors' && errors.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {errors.length}
                </span>
              )}
              {tab === 'warnings' && warnings.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-yellow-100 bg-yellow-600 rounded-full">
                  {warnings.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'summary' && (
          <div className="space-y-4">
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.totalRows}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Total Rows
                </div>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className={`text-2xl font-bold text-green-600 dark:text-green-400`}>
                  {stats.validRows}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Valid Rows
                </div>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className={`text-2xl font-bold text-red-600 dark:text-red-400`}>
                  {stats.invalidRows}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Invalid Rows
                </div>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className={`text-2xl font-bold text-yellow-600 dark:text-yellow-400`}>
                  {stats.emptyRows}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Empty Rows
                </div>
              </div>
            </div>

            {/* Data Quality Score */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Data Quality Score
                </span>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {Math.round((stats.validRows / Math.max(stats.totalRows - stats.emptyRows, 1)) * 100)}%
                </span>
              </div>
              <div className={`w-full bg-gray-200 rounded-full h-2 dark:bg-gray-600`}>
                <div 
                  className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.round((stats.validRows / Math.max(stats.totalRows - stats.emptyRows, 1)) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>

            {/* Summary message */}
            <div className={`p-4 rounded-lg ${
              isValid 
                ? 'bg-green-50 border border-green-200 dark:bg-green-900 dark:border-green-700'
                : 'bg-red-50 border border-red-200 dark:bg-red-900 dark:border-red-700'
            }`}>
              <p className={`text-sm ${
                isValid 
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {isValid 
                  ? 'Your CSV file is valid and ready to be processed.'
                  : `Your CSV file has ${errors.length} error(s) that need to be fixed before processing.`
                }
                {warnings.length > 0 && (
                  <span className="ml-2">
                    There are also {warnings.length} warning(s) that you may want to review.
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="space-y-3">
            {errors.length === 0 ? (
              <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No errors found! 🎉
              </p>
            ) : (
              errors.map((error, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 border-red-500 ${
                    darkMode ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className={`text-sm font-medium ${darkMode ? 'text-red-200' : 'text-red-800'}`}>
                        {error.type.charAt(0).toUpperCase() + error.type.slice(1)} Error
                      </p>
                      <p className={`mt-1 text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                        {error.message}
                      </p>
                      {(error.row || error.column) && (
                        <p className={`mt-1 text-xs ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                          {error.row && `Row: ${error.row}`}
                          {error.row && error.column && ' | '}
                          {error.column && `Column: ${error.column}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'warnings' && (
          <div className="space-y-3">
            {warnings.length === 0 ? (
              <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No warnings found!
              </p>
            ) : (
              warnings.map((warning, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 border-yellow-500 ${
                    darkMode ? 'bg-yellow-900 bg-opacity-20' : 'bg-yellow-50'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className={`text-sm font-medium ${darkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
                        {warning.type.charAt(0).toUpperCase() + warning.type.slice(1)} Warning
                      </p>
                      <p className={`mt-1 text-sm ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                        {warning.message}
                      </p>
                      {(warning.row || warning.column) && (
                        <p className={`mt-1 text-xs ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                          {warning.row && `Row: ${warning.row}`}
                          {warning.row && warning.column && ' | '}
                          {warning.column && `Column: ${warning.column}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'} flex justify-end space-x-3`}>
        <button
          onClick={onReject}
          disabled={isProcessing}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            darkMode
              ? 'text-gray-300 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700'
              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100'
          } disabled:cursor-not-allowed transition-colors duration-150`}
        >
          Cancel
        </button>
        <button
          onClick={onAccept}
          disabled={isProcessing || (!isValid && errors.length > 0)}
          className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
            isValid && !isProcessing
              ? 'bg-pink-600 hover:bg-pink-700'
              : 'bg-gray-400 cursor-not-allowed'
          } disabled:cursor-not-allowed transition-colors duration-150`}
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            'Proceed with Import'
          )}
        </button>
      </div>
    </div>
  );
};

export default ValidationReport;