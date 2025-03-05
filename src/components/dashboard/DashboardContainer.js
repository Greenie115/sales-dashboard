import React from 'react';
import { ExportProvider } from '../../context/ExportContext';
import Header from './Header';
import Footer from './Footer';
import MainContent from './MainContent';

/**
 * Main container for the dashboard
 * Wraps the application with necessary providers
 */
const DashboardContainer = ({ children }) => {
  return (
    <ExportProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children || <MainContent />}
          </div>
        </main>
        <Footer />
      </div>
    </ExportProvider>
  );
};

export default DashboardContainer;