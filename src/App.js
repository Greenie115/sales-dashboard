import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SharingProvider } from './context/SharingContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './components/dashboard/DashboardContainer';
import SharedDashboardView from './components/sharing/SharedDashboardView';
import SharingModal from './components/sharing/SharingModal';

function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <SharingProvider>
          {/* Removed basename="/sales-dashboard", defining routes explicitly */}
          <Router> 
            <Routes>
              <Route path="/sales-dashboard" element={<Dashboard />} />
              <Route path="/share/:shareId" element={<SharedDashboardView />} />
              {/* Add your other routes here */}
            </Routes>
            <SharingModal />
          </Router>
        </SharingProvider>
      </DataProvider>
    </ThemeProvider>
  );
}

export default App;
