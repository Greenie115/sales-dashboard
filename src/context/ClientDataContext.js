import React, { createContext, useContext } from 'react';
import { useData } from './DataContext';

// Create a context for shared/client data
const ClientDataContext = createContext();

// Custom hook to use the client data context
export const useClientData = () => {
  const context = useContext(ClientDataContext);
  if (context === undefined || context === null) {
    console.warn('No ClientDataContext found, returning empty object');
    return {}; 
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
                (clientData?.brandNames?.length > 0 ? clientData.brandNames.join(', ') : 'Client'),
    // Make sure these fields are properly passed through
    salesData: clientData?.salesData || [],
    surveyData: clientData?.surveyData || null,
    isSharedView: true,
    
    // Add utility method for accessing survey data
    getSurveyData: (questionNumber) => {
      // First check if we have precomputed survey data
      if (clientData?.surveyData?.questions && 
          clientData.surveyData.questions[questionNumber]) {
        return clientData.surveyData.questions[questionNumber];
      }
      
      // Otherwise return null
      return null;
    }
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
    
    console.log("Has salesData:", Boolean(clientData?.salesData));
    if (clientData?.salesData) {
      console.log("salesData length:", clientData.salesData.length);
    }
    
    console.log("Has surveyData:", Boolean(clientData?.surveyData));
    if (clientData?.surveyData) {
      console.log("surveyData questions:", Object.keys(clientData.surveyData.questions || {}));
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