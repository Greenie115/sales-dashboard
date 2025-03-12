// src/hooks/useThemeColors.js
import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Hook for accessing theme colors for charts and UI elements
 * 
 * @returns {Object} Color values and utility functions
 */
export const useThemeColors = () => {
  const { darkMode } = useTheme();
  
  /**
   * Generate color palette for charts and visualizations
   */
  const colors = useMemo(() => {
    return {
      // Primary and secondary colors
      primary: darkMode ? '#ff3385' : '#ff0066', // Brighter in dark mode
      secondary: darkMode ? '#3b82f6' : '#0066CC',
      
      // Color palette for charts (different colors for different data points)
      colorPalette: darkMode 
        ? ['#ff3385', '#3b82f6', '#fbbf24', '#06b6d4', '#a855f7', '#34d399', '#f97316', '#94a3b8', '#9333ea', '#6366f1'] 
        : ['#FF0066', '#0066CC', '#FFC107', '#00ACC1', '#9C27B0', '#4CAF50', '#FF9800', '#607D8B', '#673AB7', '#3F51B5'],
      
      // Chart grid colors
      gridColor: darkMode ? '#374151' : '#e5e7eb',
      axisColor: darkMode ? '#4b5563' : '#d1d5db',
      
      // Text colors
      textPrimary: darkMode ? '#f9fafb' : '#111827',
      textSecondary: darkMode ? '#9ca3af' : '#6b7280',
      
      // Background colors
      tooltipBg: darkMode ? '#1f2937' : '#ffffff',
      tooltipBorder: darkMode ? '#374151' : '#e5e7eb',
      chartBg: darkMode ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      
      // Status colors
      success: darkMode ? '#34d399' : '#10b981',
      danger: darkMode ? '#f87171' : '#ef4444',
      warning: darkMode ? '#fbbf24' : '#f59e0b',
      info: darkMode ? '#60a5fa' : '#3b82f6'
    };
  }, [darkMode]);
  
  /**
   * Generate linear gradient definitions for SVG charts
   * 
   * @param {string} id - Gradient ID
   * @param {string} color - Base color for gradient
   * @param {number} opacity1 - Start opacity
   * @param {number} opacity2 - End opacity
   * @returns {React.Element} SVG gradient definition
   */
  const getGradientDef = (id, color = colors.primary, opacity1 = 0.8, opacity2 = 0.1) => {
    return (
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={color} stopOpacity={opacity1}/>
        <stop offset="95%" stopColor={color} stopOpacity={opacity2}/>
      </linearGradient>
    );
  };
  
  /**
   * Get color based on value comparison (for showing growth)
   * 
   * @param {number} value - Value to evaluate
   * @param {boolean} inversed - Whether to inverse the color logic
   * @returns {string} Color for the value
   */
  const getComparisonColor = (value, inversed = false) => {
    if (value === 0) return colors.textSecondary;
    
    const isPositive = value > 0;
    const isNegative = value < 0;
    
    if ((isPositive && !inversed) || (isNegative && inversed)) {
      return colors.success;
    } else if ((isNegative && !inversed) || (isPositive && inversed)) {
      return colors.danger;
    }
    
    return colors.textSecondary;
  };
  
  /**
   * Get color for percentage ranges
   * 
   * @param {number} percentage - Percentage value
   * @param {Array} thresholds - Array of threshold values
   * @param {Array} customColors - Optional custom colors array
   * @returns {string} Color for the percentage
   */
  const getPercentageColor = (percentage, thresholds = [25, 50, 75], customColors = null) => {
    const colorsToUse = customColors || [
      colors.danger,
      colors.warning,
      colors.info,
      colors.success
    ];
    
    for (let i = 0; i < thresholds.length; i++) {
      if (percentage < thresholds[i]) {
        return colorsToUse[i];
      }
    }
    
    return colorsToUse[colorsToUse.length - 1];
  };
  
  /**
   * Generate rgba color with transparency
   * 
   * @param {string} hexColor - Hex color code
   * @param {number} alpha - Transparency value (0-1)
   * @returns {string} rgba color string
   */
  const getAlphaColor = (hexColor, alpha) => {
    // Handle colors with and without # prefix
    const hex = hexColor.startsWith('#') ? hexColor.substring(1) : hexColor;
    
    // Handle both 3-char and 6-char hex values
    const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
    const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
    const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  /**
   * Get Tailwind CSS class based on theme for common UI elements
   * 
   * @param {string} element - UI element type
   * @returns {string} Tailwind CSS classes
   */
  const getElementClass = (element) => {
    const classes = {
      // Buttons
      primaryButton: `px-4 py-2 rounded-md font-medium ${
        darkMode 
          ? 'bg-pink-600 hover:bg-pink-700 text-white' 
          : 'bg-pink-600 hover:bg-pink-700 text-white'
      }`,
      secondaryButton: `px-4 py-2 rounded-md font-medium ${
        darkMode 
          ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
      }`,
      
      // Cards
      card: `rounded-lg shadow ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`,
      
      // Text
      heading: darkMode ? 'text-white' : 'text-gray-900',
      subheading: darkMode ? 'text-gray-300' : 'text-gray-700',
      paragraph: darkMode ? 'text-gray-300' : 'text-gray-600',
      
      // Forms
      input: `px-3 py-2 rounded-md ${
        darkMode 
          ? 'bg-gray-700 border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500' 
          : 'bg-white border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500'
      }`
    };
    
    return classes[element] || '';
  };
  
  return {
    colors,
    getGradientDef,
    getComparisonColor,
    getPercentageColor,
    getAlphaColor,
    getElementClass
  };
};