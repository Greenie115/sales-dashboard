import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * StarRating component - displays star ratings with support for partial stars
 */
const StarRating = ({ 
  rating, 
  maxStars = 5, 
  size = 'sm', 
  showValue = true, 
  showCount = false, 
  count = null,
  className = '' 
}) => {
  const { darkMode } = useTheme();
  
  // Ensure rating is a valid number
  const numericRating = typeof rating === 'number' ? rating : parseFloat(rating) || 0;
  const clampedRating = Math.max(0, Math.min(maxStars, numericRating));
  
  // Size configurations
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };
  
  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };
  
  const starSize = sizeClasses[size] || sizeClasses.sm;
  const textSize = textSizes[size] || textSizes.sm;
  
  // Generate stars
  const stars = [];
  for (let i = 1; i <= maxStars; i++) {
    const fillPercentage = Math.max(0, Math.min(100, (clampedRating - i + 1) * 100));
    
    stars.push(
      <div key={i} className="relative inline-block">
        {/* Background star (empty) */}
        <svg 
          className={`${starSize} ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        
        {/* Filled star (overlay) */}
        {fillPercentage > 0 && (
          <div 
            className="absolute top-0 left-0 overflow-hidden"
            style={{ width: `${fillPercentage}%` }}
          >
            <svg 
              className={`${starSize} text-yellow-400`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className="flex items-center">
        {stars}
      </div>
      
      {showValue && (
        <span className={`${textSize} font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {clampedRating.toFixed(2)}
        </span>
      )}
      
      {showCount && count !== null && (
        <span className={`${textSize} ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  );
};

export default StarRating;