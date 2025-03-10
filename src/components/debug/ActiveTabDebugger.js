import React from 'react';
import { useData } from '../../context/DataContext';
import { useSharing } from '../../context/SharingContext';

const ActiveTabDebugger = () => {
  const { activeTab: dataActiveTab, setActiveTab } = useData();
  const { shareConfig, previewActiveTab, isShareModalOpen } = useSharing();
  
  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const forceSalesTab = () => {
    if (setActiveTab) {
      console.log("Forcing active tab to 'sales'");
      setActiveTab('sales');
    }
  };
  
  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
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
      <h3 style={{ margin: '0 0 5px', fontSize: '14px' }}>Tab State Debugger</h3>
      <div>
        <strong>Data Context activeTab:</strong> {dataActiveTab || 'not set'}
      </div>
      {isShareModalOpen && (
        <>
          <div>
            <strong>Share Config activeTab:</strong> {shareConfig?.activeTab || 'not set'}
          </div>
          <div>
            <strong>Share Config allowedTabs:</strong> {shareConfig?.allowedTabs?.join(', ') || 'none'}
          </div>
          <div>
            <strong>Preview activeTab:</strong> {previewActiveTab || 'not set'}
          </div>
        </>
      )}
      <div style={{ marginTop: '10px' }}>
        <button 
          onClick={forceSalesTab}
          style={{
            background: '#ff0066',
            color: 'white',
            border: 'none',
            padding: '3px 8px',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Force 'sales' tab
        </button>
      </div>
    </div>
  );
};

export default ActiveTabDebugger;