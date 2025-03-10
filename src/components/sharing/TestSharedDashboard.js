import React from 'react';
import { useParams } from 'react-router-dom';

const TestSharedDashboard = () => {
  const { shareId } = useParams();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Test Shared Dashboard</h2>
        <p className="mb-4">
          This is a test component to verify that the shared dashboard route is working.
        </p>
        <p className="mb-4">
          <strong>Share ID:</strong> {shareId}
        </p>
        <a 
          href="/"
          className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 inline-block"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
};

export default TestSharedDashboard;