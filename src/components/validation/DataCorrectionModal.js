// src/components/validation/DataCorrectionModal.js
import React, { useState, useMemo, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { 
  applyCorrectionsToCsvData, 
  autoApplyCorrections,
  CORRECTION_TYPES 
} from '../../utils/csvCorrections';
import { generateCorrectionSummary } from '../../utils/enhancedCsvValidation';

const DataCorrectionModal = ({ 
  isOpen, 
  onClose, 
  validationResult, 
  originalData,
  onAcceptCorrectedData,
  onRejectCorrections 
}) => {
  const { darkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('summary');
  const [correctionState, setCorrectionState] = useState(() => {
    // Initialize with all corrections unapplied
    return validationResult?.corrections?.map(c => ({ ...c, applied: false })) || [];
  });
  const [editingCell, setEditingCell] = useState(null);
  const [customValue, setCustomValue] = useState('');

  // Calculate correction summary
  const correctionSummary = useMemo(() => {
    if (!validationResult) return null;
    const resultWithState = { ...validationResult, corrections: correctionState };
    return generateCorrectionSummary(resultWithState);
  }, [validationResult, correctionState]);

  // Calculate data quality improvement
  const dataQualityImprovement = useMemo(() => {
    if (!validationResult) return 0;
    
    const appliedCorrections = correctionState.filter(c => c.applied).length;
    const totalIssues = validationResult.errors.length + validationResult.warnings.length;
    
    if (totalIssues === 0) return 0;
    return Math.round((appliedCorrections / totalIssues) * 100);
  }, [validationResult, correctionState]);

  // Get corrected data preview
  const correctedData = useMemo(() => {
    if (!originalData || !correctionState) return originalData;
    
    const appliedCorrections = correctionState.filter(c => c.applied);
    return applyCorrectionsToCsvData(originalData, appliedCorrections);
  }, [originalData, correctionState]);

  const handleApplyCorrection = useCallback((correctionIndex, apply) => {
    setCorrectionState(prev => 
      prev.map((correction, index) => 
        index === correctionIndex 
          ? { ...correction, applied: apply }
          : correction
      )
    );
  }, []);

  const handleApplyAllAutoCorrections = useCallback(() => {
    setCorrectionState(prev => 
      prev.map(correction => 
        correction.type === CORRECTION_TYPES.AUTO 
          ? { ...correction, applied: true }
          : correction
      )
    );
  }, []);

  const handleApplyAllSuggested = useCallback(() => {
    setCorrectionState(prev => 
      prev.map(correction => 
        correction.type === CORRECTION_TYPES.SUGGESTED 
          ? { ...correction, applied: true }
          : correction
      )
    );
  }, []);

  const handleCustomEdit = useCallback((row, column, originalValue) => {
    setEditingCell({ row, column, originalValue });
    setCustomValue(originalValue || '');
  }, []);

  const handleSaveCustomEdit = useCallback(() => {
    if (!editingCell) return;
    
    const { row, column, originalValue } = editingCell;
    
    // Add or update custom correction
    setCorrectionState(prev => {
      const existingIndex = prev.findIndex(c => c.row === row && c.column === column);
      
      const newCorrection = {
        row,
        column,
        originalValue,
        correctedValue: customValue,
        type: CORRECTION_TYPES.MANUAL,
        description: 'Custom manual correction',
        applied: true
      };
      
      if (existingIndex >= 0) {
        return prev.map((correction, index) => 
          index === existingIndex ? newCorrection : correction
        );
      } else {
        return [...prev, newCorrection];
      }
    });
    
    setEditingCell(null);
    setCustomValue('');
  }, [editingCell, customValue]);

  const handleAcceptCorrections = useCallback(() => {
    const appliedCorrections = correctionState.filter(c => c.applied);
    const finalData = applyCorrectionsToCsvData(originalData, appliedCorrections);
    onAcceptCorrectedData(finalData, appliedCorrections);
  }, [correctionState, originalData, onAcceptCorrectedData]);

  if (!isOpen || !validationResult) return null;

  const TabButton = ({ tabKey, label, count }) => (
    <button
      onClick={() => setActiveTab(tabKey)}
      className={`py-3 px-6 text-sm font-medium border-b-2 ${
        activeTab === tabKey
          ? `border-pink-500 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`
          : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
      }`}
    >
      {label} {count !== undefined && (
        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
          darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Data Correction Assistant
              </h3>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Quality Score: {validationResult.dataQualityScore}% → {Math.min(100, validationResult.dataQualityScore + dataQualityImprovement)}%
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-md ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <nav className="flex -mb-px">
            <TabButton tabKey="summary" label="Summary" />
            <TabButton tabKey="auto" label="Auto-Fix" count={correctionSummary?.autoFixable || 0} />
            <TabButton tabKey="suggested" label="Suggested" count={correctionSummary?.suggested || 0} />
            <TabButton tabKey="manual" label="Manual" count={correctionSummary?.manual || 0} />
            <TabButton tabKey="preview" label="Preview" />
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'summary' && (
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {correctionSummary?.autoFixable || 0}
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Auto-fixable issues
                  </div>
                </div>
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border`}>
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {correctionSummary?.suggested || 0}
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Suggested fixes
                  </div>
                </div>
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'} border`}>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {correctionSummary?.manual || 0}
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Manual corrections needed
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Estimated Time to Fix
                </h4>
                <div className="flex items-center space-x-4">
                  <div className={`text-lg font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    ~{Math.ceil(correctionSummary?.estimatedTimeToFix || 0)} minutes
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleApplyAllAutoCorrections}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    >
                      Apply All Auto-fixes
                    </button>
                    <button
                      onClick={handleApplyAllSuggested}
                      className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700"
                    >
                      Apply All Suggested
                    </button>
                  </div>
                </div>
              </div>

              {/* Correction Categories */}
              <div className="space-y-4">
                <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Issue Categories
                </h4>
                {Object.entries(correctionSummary?.byCategory || {}).map(([key, category]) => (
                  <div key={key} className={`p-3 rounded-md border ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {category.description}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        category.type === CORRECTION_TYPES.AUTO 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : category.type === CORRECTION_TYPES.SUGGESTED
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {category.count} issues
                      </span>
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Examples: {category.examples.map(ex => `Row ${ex.row}`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeTab === 'auto' || activeTab === 'suggested' || activeTab === 'manual') && (
            <div className="p-6 overflow-y-auto h-full">
              <div className="space-y-3">
                {correctionState
                  .filter(correction => {
                    if (activeTab === 'auto') return correction.type === CORRECTION_TYPES.AUTO;
                    if (activeTab === 'suggested') return correction.type === CORRECTION_TYPES.SUGGESTED;
                    if (activeTab === 'manual') return correction.type === CORRECTION_TYPES.MANUAL;
                    return false;
                  })
                  .map((correction, index) => (
                    <div key={`${correction.row}-${correction.column}`} 
                         className={`p-4 border rounded-lg ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              Row {correction.row}, Column {correction.column}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              correction.type === CORRECTION_TYPES.AUTO 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : correction.type === CORRECTION_TYPES.SUGGESTED
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {correction.type}
                            </span>
                          </div>
                          <div className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {correction.description}
                          </div>
                          <div className="flex items-center space-x-4">
                            <div>
                              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Original:</span>
                              <span className={`ml-2 px-2 py-1 text-sm font-mono rounded ${darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-800'}`}>
                                "{correction.originalValue}"
                              </span>
                            </div>
                            <div>
                              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Suggested:</span>
                              <span className={`ml-2 px-2 py-1 text-sm font-mono rounded ${darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-800'}`}>
                                "{correction.correctedValue}"
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {correction.type === CORRECTION_TYPES.MANUAL && (
                            <button
                              onClick={() => handleCustomEdit(correction.row, correction.column, correction.originalValue)}
                              className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => handleApplyCorrection(
                              correctionState.findIndex(c => c.row === correction.row && c.column === correction.column),
                              !correction.applied
                            )}
                            className={`px-3 py-1 text-sm rounded-md ${
                              correction.applied
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-300 text-gray-700 hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
                            }`}
                          >
                            {correction.applied ? 'Applied' : 'Apply'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="p-6 overflow-y-auto h-full">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Data Preview (First 10 rows)
                  </h4>
                  <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {correctionState.filter(c => c.applied).length} corrections applied
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Row
                        </th>
                        {Object.keys(originalData[0] || {}).map(header => (
                          <th key={header} className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                      {correctedData?.slice(0, 10).map((row, index) => (
                        <tr key={index} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                          <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {index + 1}
                          </td>
                          {Object.entries(row).map(([column, value]) => {
                            const wasChanged = correctionState.some(c => 
                              c.applied && c.row === index + 1 && c.column === column
                            );
                            
                            return (
                              <td key={column} className={`px-3 py-2 text-sm ${
                                wasChanged 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : darkMode ? 'text-gray-300' : 'text-gray-900'
                              }`}>
                                {value || ''}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
          <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {correctionState.filter(c => c.applied).length} of {correctionState.length} corrections applied
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onRejectCorrections}
              className={`px-4 py-2 text-sm font-medium rounded-md ${darkMode ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            >
              Use Original Data
            </button>
            <button
              onClick={handleAcceptCorrections}
              disabled={correctionState.filter(c => c.applied).length === 0}
              className="px-4 py-2 text-sm font-medium bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Corrections
            </button>
          </div>
        </div>
      </div>

      {/* Custom Edit Modal */}
      {editingCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl p-6 max-w-md w-full mx-4`}>
            <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Edit Cell Value
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Row {editingCell.row}, Column {editingCell.column}
                </label>
                <input
                  type="text"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setEditingCell(null)}
                  className={`px-3 py-2 text-sm rounded-md ${darkMode ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomEdit}
                  className="px-3 py-2 text-sm bg-pink-600 text-white rounded-md hover:bg-pink-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataCorrectionModal;