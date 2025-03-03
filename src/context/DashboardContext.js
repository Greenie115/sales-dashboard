import React, { createContext, useContext } from 'react';
import { useData } from './DataContext';

// Create context
const DashboardContext = createContext();

// Custom hook to use the dashboard context
export const useDashboard = () => useContext(DashboardContext);

export const DashboardProvider = ({ children }) => {
  // Get data from DataContext
  const dataContext = useData();
  
  // Pass through all the values from DataContext
  const value = {
    state: {
      ...dataContext
    },
    actions: {
      ...dataContext
    }
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export default DashboardContext;