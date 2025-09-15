// src/components/dashboard/TabContent.js
import React, { useState, useEffect } from 'react';

// Import tab components
import SummaryTab from './tabs/SummaryTab';
import SalesTab from './tabs/SalesTab';
import DemographicsTab from './tabs/DemographicsTab';
import OffersTab from './tabs/OffersTab';

const TabContent = ({ activeTab, data, filteredData }) => {
  const [isVisible, setIsVisible] = useState(true);
  
  // Add fade transition when tab changes
  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [activeTab]);
  
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
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
        }`}
      >
        {renderTabContent()}
      </div>
    </div>
  );
};

export default TabContent;