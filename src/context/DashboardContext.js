// context/DashboardContext.js
import React, { createContext, useReducer, useContext } from 'react';

// Initial state
const initialState = {
  data: [],
  filteredData: [],
  activeTab: 'summary',
  // More state properties
};

// Create context
const DashboardContext = createContext();

// Reducer function
function dashboardReducer(state, action) {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, data: action.payload };
    // More action handlers
    default:
      return state;
  }
}

// Provider component
export function DashboardProvider({ children }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  
  // Actions to modify state
  const actions = {
    setData: (data) => {
      dispatch({ type: 'SET_DATA', payload: data });
    },
    // More actions
  };
  
  return (
    <DashboardContext.Provider value={{ state, actions }}>
      {children}
    </DashboardContext.Provider>
  );
}

// Custom hook
export function useDashboard() {
  return useContext(DashboardContext);
}