import React, { Suspense, lazy } from 'react';
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { ExportProvider } from './context/ExportContext';
import { DemographicsProvider } from './context/DemographicsContext';
import { DashboardProvider } from './context/DashboardContext';
import { ThemeProvider } from './context/ThemeContext';
import { SharingProvider } from './context/SharingContext';
import { FilterProvider } from './context/FilterContext';
import Header from './components/dashboard/Header';
import Footer from './components/dashboard/Footer'; 
import MainContent from './components/dashboard/MainContent';
import SharingModal from './components/sharing/SharingModal';
import ErrorBoundary from './components/ErrorBoundary';
// import ActiveTabDebugger from './components/debug/ActiveTabDebugger';

// Lazy load the SharedDashboardView to improve performance
const SharedDashboardView = lazy(() => import('./components/sharing/SharedDashboardView'));

// Loading fallback for lazy-loaded components
const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block w-8 h-8 border-t-2 border-b-2 border-pink-600 rounded-full animate-spin"></div>
      <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
    </div>
  </div>
);

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
                    <SharingProvider>
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
                            <ErrorBoundary>
                              <SharingModal />
                            </ErrorBoundary>
                            {/* {process.env.NODE_ENV === 'development' && <ActiveTabDebugger />} */}
                          </div>
                        } />
                        
                        {/* Shared dashboard view route */}
                        <Route path="/shared/:shareId" element={
                          <Suspense fallback={<LoadingFallback />}>
                            <ErrorBoundary>
                              <SharedDashboardView />
                            </ErrorBoundary>
                          </Suspense>
                        } />
                        
                        {/* Fallback route for any unknown paths */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </SharingProvider>
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