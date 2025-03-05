// src/utils/chartColors.js
import { useTheme } from '../context/ThemeContext';

export const useChartColors = () => {
  const { darkMode } = useTheme();
  
  return {
    // Primary colors (brand-aligned)
    primary: darkMode ? '#ff3385' : '#ff0066', // Brighter in dark mode
    secondary: darkMode ? '#3b82f6' : '#0066CC',
    
    // Color palettes
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
    tooltipBorder: darkMode ? '#374151' : '#e5e7eb'
  };
};