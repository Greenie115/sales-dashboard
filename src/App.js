import React from 'react';
import { DataProvider } from './context/DataContext';
import { ExportProvider } from './context/ExportContext';
import { DemographicsProvider } from './context/DemographicsContext';
import { DashboardProvider } from './context/DashboardContext';
import Header from './components/dashboard/Header';
import Footer from './components/dashboard/Footer';
import MainContent from './components/dashboard/MainContent';

function App() {
  return (
    <DataProvider>
      <ExportProvider>
        <DemographicsProvider>
          <DashboardProvider>
            <div className="min-h-screen bg-gray-50 flex flex-col">
              <Header />
              <main className="flex-grow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  <MainContent />
                </div>
              </main>
              <Footer />
            </div>
          </DashboardProvider>
        </DemographicsProvider>
      </ExportProvider>
    </DataProvider>
  );
}

export default App;