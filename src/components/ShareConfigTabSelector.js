import React from 'react';

/**
 * TabSelector for the Sharing Modal
 * 
 * This component is fully controlled - it doesn't maintain its own state
 * and instead relies on props for values and callbacks for changes.
 */
const ShareConfigTabSelector = ({ 
  allowedTabs = ['summary'], 
  activeTab = 'summary',
  onChange,
  darkMode
}) => {
  console.log("ShareConfigTabSelector rendering with:", {
    allowedTabs,
    activeTab
  });
  
  // Handle tab toggle
  const handleTabToggle = (tab) => {
    if (!onChange) return;
    
    const isSelected = allowedTabs.includes(tab);
    let newAllowedTabs;
    let newActiveTab = activeTab;
    
    if (isSelected) {
      // Only allow removal if it's not the last tab
      if (allowedTabs.length > 1) {
        newAllowedTabs = allowedTabs.filter(t => t !== tab);
        
        // If we're removing the active tab, select a new active tab
        if (activeTab === tab) {
          newActiveTab = newAllowedTabs[0];
        }
      } else {
        // Can't remove the last tab
        return;
      }
    } else {
      // Add the tab
      newAllowedTabs = [...allowedTabs, tab];
      
      // If this is the first tab, make it active
      if (allowedTabs.length === 0) {
        newActiveTab = tab;
      }
    }
    
    // Notify parent component
    onChange({
      allowedTabs: newAllowedTabs,
      activeTab: newActiveTab
    });
  };

  // Set active tab (when user clicks on an already selected tab)
  const handleSetActiveTab = (tab) => {
    if (!onChange) return;
    
    if (allowedTabs.includes(tab) && tab !== activeTab) {
      onChange({
        allowedTabs,
        activeTab: tab
      });
    }
  };

  return (
    <div>
      <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
        Visible Tabs
      </h3>
      <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        Select which tabs to include in the shared dashboard:
      </p>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        {['summary', 'sales', 'demographics', 'offers'].map(tab => (
          <div 
            key={tab}
            className={`
              px-4 py-3 rounded-lg border flex items-center justify-between cursor-pointer
              ${allowedTabs.includes(tab) 
                ? `bg-pink-50 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800/50 ${darkMode ? 'text-pink-300' : 'text-pink-700'}` 
                : `${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-600`
              }
            `}
            onClick={() => handleTabToggle(tab)}
          >
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={allowedTabs.includes(tab)}
                onChange={(e) => {
                  // Prevent double-firing when clicking on the checkbox directly
                  e.stopPropagation();
                  handleTabToggle(tab);
                }}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mr-3"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="capitalize">{tab}</span>
            </div>
            
            {/* Show active indicator */}
            {activeTab === tab && (
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                darkMode ? 'bg-pink-800 text-pink-200' : 'bg-pink-100 text-pink-800'
              }`}>
                Active
              </span>
            )}
          </div>
        ))}
      </div>
      
      {/* Warning if no tabs selected */}
      {allowedTabs.length === 0 && (
        <div className={`p-3 mb-4 rounded-lg border ${
          darkMode ? 'bg-amber-900/20 border-amber-800/30 text-amber-300' : 
                   'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="flex items-start">
            <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Please select at least one tab to share</span>
          </div>
        </div>
      )}
      
      {/* Active tab selector (only show if multiple tabs are selected) */}
      {allowedTabs.length > 1 && (
        <div className="mt-2 mb-4">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Set Active Tab:
          </label>
          <div className="flex flex-wrap gap-2">
            {allowedTabs.map(tab => (
              <button
                key={tab}
                onClick={() => handleSetActiveTab(tab)}
                className={`px-3 py-1 text-sm rounded-md ${
                  activeTab === tab
                    ? 'bg-pink-600 text-white'
                    : `${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                }`}
              >
                <span className="capitalize">{tab}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            The active tab will be shown first when the client opens the shared dashboard.
          </p>
        </div>
      )}
    </div>
  );
};

export default ShareConfigTabSelector;