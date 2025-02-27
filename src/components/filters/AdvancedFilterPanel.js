import React, { useState, useEffect, useCallback } from 'react';
import _ from 'lodash';

/**
 * Advanced Filter Panel Component
 * Provides multi-dimensional filtering across all data columns
 * with the ability to save filter templates and compare segments
 */
const AdvancedFilterPanel = ({
  data,
  onFilterChange,
  initialFilters = {},
  showComparison = false,
  useAdvancedFilters,
  setUseAdvancedFilters,
  setActiveTab,
  setAdvancedFilteredData,
}) => {
  // Filter state management
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [comparisonFilters, setComparisonFilters] = useState({});
  const [showComparisonSetup, setShowComparisonSetup] = useState(false);
  
  // Detect available columns and their data types from the dataset
  useEffect(() => {
    if (data && data.length > 0) {
      const sample = data[0];
      const columns = Object.keys(sample).map(key => {
        // Identify column type based on data
        let type = 'string'; // default
        
        if (typeof sample[key] === 'number') {
          type = 'number';
        } else if (sample[key] instanceof Date || 
                  (typeof sample[key] === 'string' && !isNaN(Date.parse(sample[key])))) {
          type = 'date';
        }
        
        // Get unique values for enum columns (if not too many)
        let uniqueValues = [];
        if (type === 'string') {
          const allValues = _.uniq(data.map(row => row[key])).filter(Boolean);
          // Only treat as enum if reasonable number of values
          if (allValues.length <= 50) {
            uniqueValues = allValues.sort();
            type = 'enum';
          }
        }
        
        return {
          name: key,
          type,
          uniqueValues,
          // Calculate min/max for numeric columns
          ...(type === 'number' ? {
            min: _.min(data.map(row => row[key])),
            max: _.max(data.map(row => row[key]))
          } : {}),
          // Calculate date range for date columns
          ...(type === 'date' ? {
            min: _.min(data.map(row => row[key] instanceof Date ? 
                    row[key] : new Date(row[key]))),
            max: _.max(data.map(row => row[key] instanceof Date ? 
                    row[key] : new Date(row[key])))
          } : {})
        };
      });
      
      // Group columns by category (based on naming patterns)
      const categorizedColumns = _.groupBy(columns, col => {
        if (col.name.includes('question_') || col.name.includes('proposition_')) {
          return 'Survey';
        } else if (col.name.includes('shop_') || col.name.includes('chain')) {
          return 'Retailer';
        } else if (col.name.includes('product') || col.name.includes('item')) {
          return 'Product';
        } else if (col.name.includes('user') || col.name.includes('age') || col.name.includes('gender')) {
          return 'Demographics';
        } else if (col.name.includes('date') || col.name.includes('time') || col.name.includes('at')) {
          return 'Time';
        } else {
          return 'Other';
        }
      });
      
      setAvailableColumns(categorizedColumns);
    }
  }, [data]);
  
  // Apply filters to data and notify parent
  const applyFilters = useCallback((filters = activeFilters) => {
    if (!data || !filters) return;
    
    const filteredData = data.filter(item => {
      // Check each filter criterion
      return Object.entries(filters).every(([key, filter]) => {
        if (!item.hasOwnProperty(key)) return true;
        
        if (filter.type === 'enum' && filter.values) {
          // Multi-select enum filter
          return filter.values.includes(item[key]) || filter.values.length === 0;
        } else if (filter.type === 'range') {
          // Numeric range filter
          const value = parseFloat(item[key]);
          return (!filter.min || value >= filter.min) && 
                (!filter.max || value <= filter.max);
        } else if (filter.type === 'date') {
          // Date range filter
          const date = item[key] instanceof Date ? 
                      item[key] : new Date(item[key]);
          return (!filter.min || date >= new Date(filter.min)) && 
                (!filter.max || date <= new Date(filter.max));
        } else if (filter.type === 'text') {
          // Text search filter
          return item[key] && item[key].toString().toLowerCase()
                .includes(filter.value.toLowerCase());
        }
        
        return true;
      });
    });
    
    onFilterChange(filteredData, filters);
  }, [data, activeFilters, onFilterChange]);
  
  // Handle filter changes
  const updateFilter = (columnName, filterValue) => {
    setActiveFilters(prev => ({
      ...prev,
      [columnName]: filterValue
    }));
  };
  
  // Remove a filter
  const removeFilter = (columnName) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[columnName];
      return newFilters;
    });
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters({});
  };
  
  // Save current filter template
  const saveTemplate = () => {
    if (!templateName.trim()) return;
    
    setSavedTemplates(prev => [
      ...prev,
      {
        name: templateName,
        filters: { ...activeFilters },
        created: new Date()
      }
    ]);
    
    setTemplateName('');
  };
  
  // Load a saved template
  const loadTemplate = (templateIndex) => {
    if (savedTemplates[templateIndex]) {
      setActiveFilters(savedTemplates[templateIndex].filters);
    }
  };
  
  // Setup comparison filters
  const setupComparison = () => {
    setComparisonFilters({ ...activeFilters });
    setShowComparisonSetup(true);
  };
  
  // Apply both primary and comparison filters
  const applyComparison = () => {
    if (showComparison) {
      const primaryFiltered = data.filter(/* apply activeFilters */);
      const comparisonFiltered = data.filter(/* apply comparisonFilters */);
      
      onFilterChange({
        primary: primaryFiltered,
        comparison: comparisonFiltered
      });
    } else {
      applyFilters();
    }
  };
  
  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [activeFilters, applyFilters]);
  
  // Helper function to get column metadata
  const getColumnInfo = (columnName) => {
    for (const category in availableColumns) {
      const column = availableColumns[category].find(col => col.name === columnName);
      if (column) return column;
    }
    return null;
  };

  // Render filter controls based on column type
  const renderFilterControl = (column) => {
    const filter = activeFilters[column.name];
    
    switch (column.type) {
      case 'enum':
        return (
          <div className="my-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {column.name}
            </label>
            <div className="max-h-40 overflow-y-auto border rounded p-2">
              {column.uniqueValues.map(value => (
                <div key={value} className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    id={`${column.name}_${value}`}
                    checked={filter?.values?.includes(value) || false}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      updateFilter(column.name, {
                        type: 'enum',
                        values: isChecked
                          ? [...(filter?.values || []), value]
                          : (filter?.values || []).filter(v => v !== value)
                      });
                    }}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`${column.name}_${value}`} className="ml-2 text-sm text-gray-700">
                    {value}
                  </label>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'number':
        return (
          <div className="my-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {column.name}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500">Min</label>
                <input
                  type="number"
                  value={filter?.min || ''}
                  onChange={(e) => updateFilter(column.name, {
                    type: 'range',
                    min: e.target.value ? parseFloat(e.target.value) : null,
                    max: filter?.max
                  })}
                  className="block w-full p-2 text-sm border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Max</label>
                <input
                  type="number"
                  value={filter?.max || ''}
                  onChange={(e) => updateFilter(column.name, {
                    type: 'range',
                    min: filter?.min,
                    max: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  className="block w-full p-2 text-sm border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        );
        
      case 'date':
        return (
          <div className="my-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {column.name}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500">From</label>
                <input
                  type="date"
                  value={filter?.min || ''}
                  onChange={(e) => updateFilter(column.name, {
                    type: 'date',
                    min: e.target.value || null,
                    max: filter?.max
                  })}
                  className="block w-full p-2 text-sm border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">To</label>
                <input
                  type="date"
                  value={filter?.max || ''}
                  onChange={(e) => updateFilter(column.name, {
                    type: 'date',
                    min: filter?.min,
                    max: e.target.value || null
                  })}
                  className="block w-full p-2 text-sm border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        );
        
      default: // string or other
        return (
          <div className="my-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {column.name}
            </label>
            <input
              type="text"
              value={filter?.value || ''}
              onChange={(e) => updateFilter(column.name, {
                type: 'text',
                value: e.target.value
              })}
              placeholder={`Search ${column.name}...`}
              className="block w-full p-2 text-sm border border-gray-300 rounded-md"
            />
          </div>
        );
    }
  };
  
  // The number of active filters
  const activeFilterCount = Object.keys(activeFilters).length;
  
  return (
    <div className="bg-white p-4 shadow rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">Advanced Filters</h2>
        <div className="flex space-x-2">
          <button
            onClick={clearAllFilters}
            disabled={activeFilterCount === 0}
            className={`px-3 py-1 rounded-md text-sm ${
              activeFilterCount > 0
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Clear All
          </button>
          {showComparison && (
            <button
              onClick={setupComparison}
              className="px-3 py-1 rounded-md text-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
            >
              Compare Segments
            </button>
          )}
        </div>
      </div>
      
      {/* Active filters summary */}
      {activeFilterCount > 0 && (
        <div className="mb-4 p-3 bg-pink-50 rounded-md">
          <div className="text-sm font-medium text-pink-700 mb-2">Active Filters:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(activeFilters).map(([columnName, filter]) => (
              <div 
                key={columnName}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800"
              >
                <span>{columnName}: </span>
                <span className="ml-1">
                  {filter.type === 'enum' 
                    ? `${filter.values.length} selected` 
                    : filter.type === 'range' 
                      ? `${filter.min || 'min'} - ${filter.max || 'max'}`
                      : filter.type === 'date'
                        ? `${filter.min || 'start'} to ${filter.max || 'end'}`
                        : filter.value}
                </span>
                <button
                  onClick={() => removeFilter(columnName)}
                  className="ml-1 text-pink-500 hover:text-pink-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Filter templates */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <div className="flex items-end gap-2 mb-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Save Filter Template
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name..."
              className="block w-full p-2 text-sm border border-gray-300 rounded-md"
            />
          </div>
          <button
            onClick={saveTemplate}
            disabled={!templateName.trim() || activeFilterCount === 0}
            className={`px-3 py-2 rounded-md text-sm ${
              templateName.trim() && activeFilterCount > 0
                ? 'bg-pink-600 text-white hover:bg-pink-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Save
          </button>
        </div>
        
        {savedTemplates.length > 0 && (
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Saved Templates
            </label>
            <div className="flex flex-wrap gap-2">
              {savedTemplates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => loadTemplate(index)}
                  className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                  {template.name} ({Object.keys(template.filters).length})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Filter categories with accordions */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto p-1">
        {Object.entries(availableColumns).map(([category, columns]) => (
          <div key={category} className="border rounded-md overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 flex justify-between items-center cursor-pointer">
              <h3 className="text-sm font-medium text-gray-700">{category}</h3>
              <span className="text-xs text-gray-500">{columns.length} fields</span>
            </div>
            <div className="p-4 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {columns.map(column => (
                  <div key={column.name} className="border p-2 rounded">
                    {renderFilterControl(column)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Comparison setup modal */}
      {showComparisonSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Segment Comparison Setup</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-pink-700 mb-2">Primary Segment</h4>
                <div className="p-3 bg-pink-50 rounded-md">
                  {Object.entries(activeFilters).map(([columnName, filter]) => (
                    <div key={columnName} className="mb-2">
                      <span className="text-sm font-medium">{columnName}:</span>
                      <span className="ml-2 text-sm">
                        {filter.type === 'enum' 
                          ? `${filter.values.length} selected` 
                          : filter.type === 'range' 
                            ? `${filter.min || 'min'} - ${filter.max || 'max'}`
                            : filter.type === 'date'
                              ? `${filter.min || 'start'} to ${filter.max || 'end'}`
                              : filter.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-blue-700 mb-2">Comparison Segment</h4>
                <div className="p-3 bg-blue-50 rounded-md">
                  {/* Comparison filter controls would go here */}
                  {/* For brevity, I'm simplifying this part */}
                  <p className="text-sm text-gray-500 italic">
                    Configure comparison filters here...
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setShowComparisonSetup(false)}
                className="px-4 py-2 rounded-md text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={applyComparison}
                className="px-4 py-2 rounded-md text-sm bg-pink-600 text-white hover:bg-pink-700"
              >
                Apply Comparison
              </button>
              <div className="mt-4 flex justify-end">
                <button
                    onClick={() => {
                    setUseAdvancedFilters(!useAdvancedFilters);
                    if (!useAdvancedFilters) {
                        setActiveTab('advanced-filters');
                    } else {
                        // Reset to basic filtering
                        setAdvancedFilteredData([]);
                    }
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                    {useAdvancedFilters 
                    ? "Switch to Basic Filters" 
                    : "Switch to Advanced Filters"}
                </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilterPanel;