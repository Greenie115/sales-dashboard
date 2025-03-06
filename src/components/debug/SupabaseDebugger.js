import React, { useState, useEffect } from 'react';
import supabase from '../../utils/supabase';

const SupabaseDebugger = () => {
  const [status, setStatus] = useState('Checking connection...');
  const [error, setError] = useState(null);
  const [envVars, setEnvVars] = useState({});
  const [testResult, setTestResult] = useState(null);
  
  useEffect(() => {
    // Check environment variables
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    
    setEnvVars({
      url: supabaseUrl ? 'Set ✓' : 'Missing ✗',
      key: supabaseKey ? 'Set ✓' : 'Missing ✗',
    });
  }, []);
  
  const testConnection = async () => {
    try {
      setStatus('Testing connection...');
      // Try a simple query to test the connection
      const { data, error } = await supabase
        .from('shared_dashboards')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      
      setTestResult({
        success: true,
        message: 'Connection successful!',
        data: data || []
      });
      setStatus('Connected');
      setError(null);
    } catch (err) {
      console.error('Supabase connection test failed:', err);
      setTestResult({
        success: false,
        message: 'Connection failed',
        error: err.message || 'Unknown error'
      });
      setStatus('Connection failed');
      setError(err);
    }
  };
  
  const testTableCreation = async () => {
    try {
      setStatus('Testing table...');
      
      // Try to create a test record
      const testData = {
        share_id: `test-${Date.now()}`,
        config: { test: true },
        metadata: { test: 'This is a test record' }
      };
      
      const { data, error } = await supabase
        .from('shared_dashboards')
        .insert(testData)
        .select();
      
      if (error) throw error;
      
      setTestResult({
        success: true,
        message: 'Table test successful!',
        data
      });
      setStatus('Table test passed');
      setError(null);
      
      // Clean up the test record
      if (data && data.length > 0) {
        await supabase
          .from('shared_dashboards')
          .delete()
          .eq('id', data[0].id);
      }
    } catch (err) {
      console.error('Supabase table test failed:', err);
      setTestResult({
        success: false,
        message: 'Table test failed',
        error: err.message || 'Unknown error'
      });
      setStatus('Table test failed');
      setError(err);
    }
  };
  
  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
      <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Supabase Connection Debugger</h2>
      
      <div className="mb-4">
        <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Environment Variables</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-white dark:bg-gray-700 rounded border dark:border-gray-600">
            <span className="font-medium">REACT_APP_SUPABASE_URL:</span> {envVars.url}
          </div>
          <div className="p-2 bg-white dark:bg-gray-700 rounded border dark:border-gray-600">
            <span className="font-medium">REACT_APP_SUPABASE_ANON_KEY:</span> {envVars.key}
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Connection Status</h3>
        <div className={`p-3 rounded border ${
          status === 'Connected' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/30' :
          status.includes('failed') ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/30' :
          'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800/30'
        }`}>
          {status}
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 rounded border bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/30">
          <h3 className="font-medium mb-2 text-red-800 dark:text-red-300">Error</h3>
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
      
      {testResult && (
        <div className="mb-4 p-3 rounded border bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
          <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Test Result</h3>
          <div className={`mb-2 p-2 rounded ${
            testResult.success ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
          }`}>
            {testResult.message}
          </div>
          {testResult.error && (
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded mb-2">
              <p className="font-medium">Error: {testResult.error}</p>
            </div>
          )}
          {testResult.data && (
            <div className="p-2 bg-white dark:bg-gray-800 rounded">
              <p className="font-medium mb-1">Data:</p>
              <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-40">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
      
      <div className="flex space-x-3">
        <button 
          onClick={testConnection}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
        >
          Test Connection
        </button>
        <button 
          onClick={testTableCreation}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
        >
          Test Table
        </button>
      </div>
    </div>
  );
};

export default SupabaseDebugger;