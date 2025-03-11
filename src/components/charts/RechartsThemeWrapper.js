import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const RechartsThemeWrapper = ({ children, ...props }) => {
  const { darkMode } = useTheme();
  
  // Deep clone the React elements and modify their props to add dark mode styles
  const addDarkModeStyles = (element) => {
    if (!element || typeof element !== 'object') {
      return element;
    }
    
    // Clone the element
    const newElement = React.cloneElement(
      element,
      { ...element.props },
      // Process children recursively
      React.Children.map(element.props.children, child => addDarkModeStyles(child))
    );
    
    // Add dark mode styles to specific Recharts components
    if (element.type) {
      const displayName = element.type.displayName || '';
      
      // Add dark mode styles based on component type
      if (displayName === 'CartesianGrid') {
        return React.cloneElement(newElement, {
          stroke: darkMode ? '#374151' : '#e5e7eb'
        });
      }
      
      if (displayName === 'XAxis' || displayName === 'YAxis') {
        return React.cloneElement(newElement, {
          tick: { fill: darkMode ? '#9ca3af' : '#6b7280' },
          axisLine: { stroke: darkMode ? '#4b5563' : '#d1d5db' }
        });
      }
      
      if (displayName === 'Tooltip') {
        return React.cloneElement(newElement, {
          contentStyle: darkMode ? { 
            backgroundColor: '#1f2937', 
            border: '1px solid #374151', 
            color: '#e5e7eb',
            borderRadius: '4px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          } : {}
        });
      }
      
      if (displayName === 'Legend') {
        return React.cloneElement(newElement, {
          wrapperStyle: darkMode ? { color: '#e5e7eb' } : {}
        });
      }
      
      if (displayName === 'Bar') {
        // We don't modify the Bar component's props directly
        // since Cell components are used for individual bar colors
        return newElement;
      }
      
      if (displayName === 'Line') {
        return React.cloneElement(newElement, {
          stroke: newElement.props.stroke || (darkMode ? '#ff4d94' : '#ff0066')
        });
      }
      
      if (displayName === 'Area') {
        return React.cloneElement(newElement, {
          stroke: newElement.props.stroke || (darkMode ? '#4d94ff' : '#0066cc'),
          fill: newElement.props.fill || (darkMode ? 'url(#colorUv)' : 'url(#colorUv)')
        });
      }
    }
    
    return newElement;
  };
  
  return addDarkModeStyles(children);
};

export default RechartsThemeWrapper;