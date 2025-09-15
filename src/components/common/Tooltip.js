import React, { useState, useRef, useEffect } from 'react';

const Tooltip = ({ 
  children, 
  content, 
  position = 'top', 
  delay = 300,
  className = '',
  disabled = false 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const timeoutRef = useRef(null);
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);

  const showTooltip = () => {
    if (disabled || !content) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // Calculate position after showing to ensure proper positioning
      setTimeout(() => calculatePosition(), 10);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const calculatePosition = () => {
    if (!tooltipRef.current || !triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let newPosition = position;

    // Check if tooltip would go off-screen and adjust position
    if (position === 'top' && triggerRect.top - tooltipRect.height < 10) {
      newPosition = 'bottom';
    } else if (position === 'bottom' && triggerRect.bottom + tooltipRect.height > viewportHeight - 10) {
      newPosition = 'top';
    } else if (position === 'left' && triggerRect.left - tooltipRect.width < 10) {
      newPosition = 'right';
    } else if (position === 'right' && triggerRect.right + tooltipRect.width > viewportWidth - 10) {
      newPosition = 'left';
    }

    setActualPosition(newPosition);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getTooltipClasses = () => {
    const baseClasses = 'absolute z-50 px-3 py-2 text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-lg border border-gray-700 dark:border-gray-300 max-w-xs break-words transition-opacity duration-200';
    
    const positionClasses = {
      top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
    };

    return `${baseClasses} ${positionClasses[actualPosition]} ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`;
  };

  const getArrowClasses = () => {
    const baseClasses = 'absolute w-2 h-2 bg-gray-900 dark:bg-gray-100 transform rotate-45';
    
    const arrowPositions = {
      top: 'top-full left-1/2 transform -translate-x-1/2 -mt-1',
      bottom: 'bottom-full left-1/2 transform -translate-x-1/2 -mb-1',
      left: 'left-full top-1/2 transform -translate-y-1/2 -ml-1',
      right: 'right-full top-1/2 transform -translate-y-1/2 -mr-1'
    };

    return `${baseClasses} ${arrowPositions[actualPosition]}`;
  };

  if (disabled || !content) {
    return children;
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="cursor-help"
      >
        {children}
      </div>
      
      <div
        ref={tooltipRef}
        className={getTooltipClasses()}
        role="tooltip"
        aria-hidden={!isVisible}
      >
        <div className={getArrowClasses()}></div>
        <div className="relative z-10">
          {typeof content === 'string' ? content : content}
        </div>
      </div>
    </div>
  );
};

// Helper component for info icons with tooltips
export const InfoTooltip = ({ content, className = '' }) => (
  <Tooltip content={content} position="top" className={className}>
    <svg 
      className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    </svg>
  </Tooltip>
);

// Helper component for question mark icons with tooltips
export const HelpTooltip = ({ content, className = '' }) => (
  <Tooltip content={content} position="top" className={className}>
    <svg 
      className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    </svg>
  </Tooltip>
);

export default Tooltip;