// src/App.js
import React from 'react';
import { DashboardProvider } from './context/DashboardContext';
import DashboardContainer from './components/dashboard/DashboardContainer';
import './index.css';

function App() {
  return (
    <DashboardProvider>
      <DashboardContainer />
    </DashboardProvider>
  );
}

export default App;