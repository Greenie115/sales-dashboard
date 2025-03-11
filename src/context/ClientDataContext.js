import React, { createContext, useContext } from 'react';
import { useData } from './DataContext';

// Create a context for shared/client data
const ClientDataContext = createContext();

// Custom hook to use the client data context
export const useClientData = () => {
  const context = useContext(ClientDataContext);
  const dataContext = useData();
  
  // If no client data is found, fall back to the regular DataContext
  if (!context) {
    console.warn("No ClientDataContext found, falling back to DataContext");
    return dataContext;
  }
  return context;
};

// Provider component for wrapping shared dashboard views
export const ClientDataProvider = ({ children, clientData }) => {
  // Ensure client name is available
  const enhancedClientData = {
    ...clientData,
    // Add fallbacks for clientName
    clientName: clientData?.clientName || 
                clientData?.metadata?.clientName || 
                (clientData?.brandNames?.length > 0 ? clientData.brandNames.join(', ') : 'Client')
  };
  
  // Add debugging if in development mode
  if (process.env.NODE_ENV === 'development') {
    console.group("ClientDataContext Debug Info");
    console.log("Data structure:", Object.keys(clientData || {}));
    console.log("Client Name:", enhancedClientData.clientName);
    console.log("Brand Names:", enhancedClientData.brandNames);
    
    // Check for critical data
    console.log("Has filteredData:", Boolean(clientData?.filteredData));
    if (clientData?.filteredData) {
      console.log("filteredData length:", clientData.filteredData.length);
    }
    
    console.log("Has metrics:", Boolean(clientData?.metrics));
    console.log("Has retailerData:", Boolean(clientData?.retailerData));
    console.log("Has productDistribution:", Boolean(clientData?.productDistribution));
    console.groupEnd();
  }

  return (
    <ClientDataContext.Provider value={enhancedClientData}>
      {children}
    </ClientDataContext.Provider>
  );
};
export default ClientDataContext;