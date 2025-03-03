import React from 'react';
import { DashboardProvider } from '../../context/DashboardContext';
import { DataProvider } from '../../context/DataContext';
import { FilterProvider } from '../../context/FilterContext';
import { DemographicsProvider } from '../../context/DemographicsContext';
import { ExportProvider } from '../../context/ExportContext';
import Header from './Header';
import MainContent from './MainContent';
import Footer from './Footer';

/**
 * Main dashboard container component that wraps the entire application
 * with context providers and renders the main structure
 */
const DashboardContainer = () => {
  return (
    <DashboardProvider>
      <DataProvider>
        <FilterProvider>
          <DemographicsProvider>
            <ExportProvider>
              <div className="min-h-screen bg-gray-50">
                <Header />
                <MainContent />
                <Footer />
              </div>
            </ExportProvider>
          </DemographicsProvider>
        </FilterProvider>
      </DataProvider>
    </DashboardProvider>
  );
};

export default DashboardContainer;