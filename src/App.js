import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { ExportProvider } from './context/ExportContext';
import { DemographicsProvider } from './context/DemographicsContext';
import { DashboardProvider } from './context/DashboardContext';
import { ThemeProvider } from './context/ThemeContext';
import { SharingProvider } from './context/SharingContext';
import Header from './components/dashboard/Header';
import Footer from './components/dashboard/Footer';
import MainContent from './components/dashboard/MainContent';
import SharingModal from './components/sharing/SharingModal';
import SharedDashboardView from './components/sharing/SharedDashboardView';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <DataProvider>
          <ExportProvider>
            <DemographicsProvider>
              <DashboardProvider>
                <SharingProvider>
                  <Routes>
                    {/* Main dashboard route */}
                    <Route path="/" element={
                      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
                        <Header />
                        <main className="flex-grow">
                          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                            <MainContent />
                          </div>
                        </main>
                        <Footer />
                        <SharingModal />
                      </div>
                    } />
                    
                    {/* Shared dashboard view route */}
                    <Route path="/shared/:shareId" element={<SharedDashboardView />} />
                  </Routes>
                </SharingProvider>
              </DashboardProvider>
            </DemographicsProvider>
          </ExportProvider>
        </DataProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;