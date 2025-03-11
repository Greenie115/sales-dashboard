// src/components/dashboard/ClientNameEditor.js
import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';

/**
 * Component for editing the client name
 */
const ClientNameEditor = () => {
  const { darkMode } = useTheme();
  const { clientName, setClientName, brandNames } = useData();
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempClientName, setTempClientName] = useState(clientName);
  
  // Handle edit button click
  const handleEditClick = () => {
    setTempClientName(clientName);
    setIsEditing(true);
  };
  
  // Handle save
  const handleSave = () => {
    setClientName(tempClientName || (brandNames?.length > 0 ? brandNames.join(', ') : 'Client'));
    setIsEditing(false);
  };
  
  // Handle cancel
  const handleCancel = () => {
    setIsEditing(false);
  };
  
  // Use brand names as client name
  const useBrandNames = () => {
    if (brandNames && brandNames.length > 0) {
      setTempClientName(brandNames.join(', '));
    }
  };
  
  return (
    <div className={`p-3 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Client Name
        </h3>
        {!isEditing && (
          <button
            onClick={handleEditClick}
            className={`text-xs px-2 py-1 rounded ${
              darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Edit
          </button>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={tempClientName}
            onChange={(e) => setTempClientName(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500' 
                : 'border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500'
            }`}
            placeholder="Enter client name"
          />
          
          {brandNames && brandNames.length > 0 && (
            <button
              onClick={useBrandNames}
              className={`w-full text-xs px-2 py-1 rounded text-left ${
                darkMode 
                  ? 'bg-gray-700 text-blue-400 hover:bg-gray-600' 
                  : 'bg-gray-50 text-blue-600 hover:bg-gray-100'
              }`}
            >
              Use brand names: {brandNames.join(', ')}
            </button>
          )}
          
          <div className="flex space-x-2 justify-end">
            <button
              onClick={handleCancel}
              className={`px-3 py-1 rounded text-sm ${
                darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-pink-600 text-white rounded text-sm hover:bg-pink-700"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className={`py-2 px-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {clientName || (brandNames?.length > 0 ? brandNames.join(', ') : 'Client')}
          </p>
        </div>
      )}
    </div>
  );
};

export default ClientNameEditor;