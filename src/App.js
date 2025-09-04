import React from 'react';
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { ExportProvider } from './context/ExportContext';
import { DemographicsProvider } from './context/DemographicsContext';
import { DashboardProvider } from './context/DashboardContext';
import { ThemeProvider } from './context/ThemeContext';
import { FilterProvider } from './context/FilterContext';
import Header from './components/dashboard/Header';
import Footer from './components/dashboard/Footer'; 
import MainContent from './components/dashboard/MainContent';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary
      fallback={(error) => (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-600 mb-4">Application Error</h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              We're sorry, but something went wrong. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )}
    >
      <Router>
        <ThemeProvider>
          <DataProvider>
            <FilterProvider>
              <ExportProvider>
                <DemographicsProvider>
                  <DashboardProvider>
                    <Routes>
                      {/* Main dashboard route */}
                      <Route path="/" element={
                        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
                          <ErrorBoundary>
                            <Header />
                          </ErrorBoundary>
                          <main className="flex-grow">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                              <ErrorBoundary>
                                <MainContent />
                              </ErrorBoundary>
                            </div>
                          </main>
                          <ErrorBoundary>
                            <Footer />
                          </ErrorBoundary>
                        </div>
                      } />
                      
                      {/* Fallback route for any unknown paths */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </DashboardProvider>
                </DemographicsProvider>
              </ExportProvider>
            </FilterProvider>
          </DataProvider>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;