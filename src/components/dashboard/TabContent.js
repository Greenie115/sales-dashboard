// src/components/dashboard/TabContent.js
import React from 'react';
import { useData } from '../../context/DataContext';

// Import tab components
import SummaryTab from './tabs/SummaryTab';
import SalesTab from './tabs/SalesTab';
import DemographicsTab from './tabs/DemographicsTab';
import OffersTab from './tabs/OffersTab';

const TabContent = ({ activeTab, data, filteredData }) => {
  // Use DataContext directly instead of DashboardContext
  const dataContext = useData();
  
  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return <SummaryTab />;
      case 'sales':
        return <SalesTab />;
      case 'demographics':
        return <DemographicsTab />;
      case 'offers':
        return <OffersTab />;
      default:
        return <div className="p-6">Tab content not found</div>;
    }
  };
  
  return (
    <div className="p-6">
      {renderTabContent()}
    </div>
  );
};

export default TabContent;