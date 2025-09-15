import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'pink', 
  className = '',
  text = '',
  centered = false 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const colorClasses = {
    pink: 'text-pink-600 dark:text-pink-400',
    blue: 'text-blue-600 dark:text-blue-400',
    gray: 'text-gray-600 dark:text-gray-400',
    green: 'text-green-600 dark:text-green-400'
  };

  const spinner = (
    <div className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}>
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );

  if (text) {
    const content = (
      <div className="flex items-center space-x-2">
        {spinner}
        <span className={`text-sm ${colorClasses[color]}`}>{text}</span>
      </div>
    );

    return centered ? (
      <div className="flex justify-center items-center py-8">
        {content}
      </div>
    ) : content;
  }

  return centered ? (
    <div className="flex justify-center items-center py-8">
      {spinner}
    </div>
  ) : spinner;
};

// Skeleton loading component for content placeholders
export const SkeletonLoader = ({ 
  className = '',
  height = 'h-4',
  width = 'w-full',
  animated = true 
}) => (
  <div 
    className={`bg-gray-200 dark:bg-gray-700 rounded ${height} ${width} ${animated ? 'animate-pulse' : ''} ${className}`}
  />
);

// Loading overlay component
export const LoadingOverlay = ({ 
  isVisible = false, 
  text = 'Loading...',
  transparent = false 
}) => {
  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${
      transparent 
        ? 'bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm' 
        : 'bg-white dark:bg-gray-900'
    }`}>
      <div className="text-center">
        <LoadingSpinner size="xl" color="pink" />
        {text && (
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">{text}</p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;