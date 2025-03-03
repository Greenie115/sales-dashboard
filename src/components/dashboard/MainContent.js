// src/components/dashboard/MainContent.js
import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import PageTitle from './PageTitle';
import TabContent from './TabContent';

const MainContent = () => {
  const { state } = useDashboard();
  const { activeTab, data, filteredData, metrics, brandInfo, clientName } = state;
  
  return (
    <div className="bg-white shadow rounded-lg">
      <PageTitle 
        activeTab={activeTab}
        brandNames={brandInfo.brandNames}
        clientName={clientName}
        metrics={metrics}
      />
      
      <TabContent 
        activeTab={activeTab} 
        data={data}
        filteredData={filteredData}
      />
    </div>
  );
};

export default MainContent;