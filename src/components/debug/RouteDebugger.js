// Create this component in src/components/debug/RouteDebugger.js

import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

const RouteDebugger = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  
  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div 
      style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        zIndex: 9999,
        padding: '10px',
        background: '#f0f0f0',
        border: '1px solid #ccc',
        borderRadius: '5px',
        fontSize: '12px',
        maxWidth: '300px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}
    >
      <h3 style={{ margin: '0 0 5px', fontSize: '14px' }}>Route Debugger</h3>
      <div>
        <strong>Path:</strong> {location.pathname}
      </div>
      <div>
        <strong>Hash:</strong> {location.hash || '(none)'}
      </div>
      <div>
        <strong>Search:</strong> {location.search || '(none)'}
      </div>
      <div>
        <strong>Params:</strong> {JSON.stringify(params) || '(none)'}
      </div>
      <div style={{ marginTop: '10px' }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            background: '#ff0066',
            color: 'white',
            border: 'none',
            padding: '3px 8px',
            borderRadius: '3px',
            cursor: 'pointer',
            marginRight: '5px'
          }}
        >
          Go Home
        </button>
        
        <button 
          onClick={() => navigate('/shared/test-123')}
          style={{
            background: '#0066cc',
            color: 'white',
            border: 'none',
            padding: '3px 8px',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Test Shared Route
        </button>
      </div>
    </div>
  );
};

export default RouteDebugger;