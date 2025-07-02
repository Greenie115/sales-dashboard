import React, { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useChartColors } from '../../utils/chartColors';

const FunnelChart = ({ 
  data = [], 
  width = 600, 
  height = 400, 
  title = "Funnel Analysis",
  showLabels = true,
  showPercentages = true,
  showTooltip = true 
}) => {
  const { darkMode } = useTheme();
  const colors = useChartColors();

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Sort data by value descending to create proper funnel shape
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    const maxValue = sortedData[0]?.value || 1;

    return sortedData.map((item, index) => ({
      ...item,
      percentage: ((item.value / maxValue) * 100).toFixed(1),
      conversionRate: index === 0 ? 100 : ((item.value / sortedData[0].value) * 100).toFixed(1),
      dropoffRate: index === 0 ? 0 : (((sortedData[index - 1].value - item.value) / sortedData[index - 1].value) * 100).toFixed(1),
      width: (item.value / maxValue) * 100,
      displayValue: typeof item.value === 'number' ? item.value.toLocaleString() : item.value
    }));
  }, [data]);

  const margin = { top: 60, right: 100, bottom: 60, left: 100 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const stepHeight = processedData.length > 0 ? chartHeight / processedData.length : 0;

  const [tooltip, setTooltip] = React.useState({ visible: false, x: 0, y: 0, content: null });

  const handleStepHover = (event, stepData) => {
    if (!showTooltip) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      content: stepData
    });
  };

  const handleStepLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, content: null });
  };

  const getFunnelColor = (index) => {
    return colors.colorPalette[index % colors.colorPalette.length];
  };

  const getConnectorPath = (currentStep, nextStep, currentIndex) => {
    if (!nextStep) return '';

    const currentY = margin.top + currentIndex * stepHeight + stepHeight;
    const nextY = margin.top + (currentIndex + 1) * stepHeight;
    
    const currentLeftX = margin.left + (chartWidth - (currentStep.width / 100) * chartWidth) / 2;
    const currentRightX = margin.left + (chartWidth + (currentStep.width / 100) * chartWidth) / 2;
    
    const nextLeftX = margin.left + (chartWidth - (nextStep.width / 100) * chartWidth) / 2;
    const nextRightX = margin.left + (chartWidth + (nextStep.width / 100) * chartWidth) / 2;

    return `M ${currentLeftX} ${currentY} L ${nextLeftX} ${nextY} L ${nextRightX} ${nextY} L ${currentRightX} ${currentY} Z`;
  };

  return (
    <div className="relative w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
          {title}
        </h3>
      )}
      
      <div className="flex justify-center">
        <svg width={width} height={height} className="funnel-chart">
          <defs>
            <filter id="funnelShadow">
              <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.3" />
            </filter>
            <linearGradient id="funnelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.primary} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.primary} stopOpacity="0.4" />
            </linearGradient>
          </defs>
          
          {/* Funnel Steps */}
          {processedData.map((step, index) => {
            const stepY = margin.top + index * stepHeight;
            const stepWidth = (step.width / 100) * chartWidth;
            const stepX = margin.left + (chartWidth - stepWidth) / 2;
            
            return (
              <g key={`step-${index}`}>
                {/* Connector to next step */}
                {index < processedData.length - 1 && (
                  <path
                    d={getConnectorPath(step, processedData[index + 1], index)}
                    fill={darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}
                    stroke={darkMode ? '#4b5563' : '#d1d5db'}
                    strokeWidth={1}
                  />
                )}
                
                {/* Main funnel step */}
                <rect
                  x={stepX}
                  y={stepY}
                  width={stepWidth}
                  height={stepHeight - 10}
                  fill={getFunnelColor(index)}
                  stroke={darkMode ? '#374151' : '#e5e7eb'}
                  strokeWidth={1}
                  rx={4}
                  className="transition-all duration-200 hover:brightness-110 cursor-pointer"
                  filter="url(#funnelShadow)"
                  onMouseEnter={(e) => handleStepHover(e, step)}
                  onMouseLeave={handleStepLeave}
                />
                
                {/* Step labels */}
                {showLabels && (
                  <text
                    x={margin.left + chartWidth / 2}
                    y={stepY + stepHeight / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-sm font-medium pointer-events-none"
                    fill={step.width > 40 ? '#ffffff' : colors.textPrimary}
                  >
                    {step.name}
                  </text>
                )}
                
                {/* Value labels */}
                <text
                  x={stepX + stepWidth + 10}
                  y={stepY + stepHeight / 2 - 8}
                  className="text-sm font-semibold"
                  fill={colors.textPrimary}
                >
                  {step.displayValue}
                </text>
                
                {/* Percentage labels */}
                {showPercentages && (
                  <text
                    x={stepX + stepWidth + 10}
                    y={stepY + stepHeight / 2 + 8}
                    className="text-xs"
                    fill={colors.textSecondary}
                  >
                    {step.conversionRate}% conversion
                  </text>
                )}
                
                {/* Dropoff rate (except for first step) */}
                {showPercentages && index > 0 && (
                  <text
                    x={stepX - 10}
                    y={stepY + stepHeight / 2}
                    textAnchor="end"
                    className="text-xs"
                    fill={darkMode ? '#ef4444' : '#dc2626'}
                  >
                    -{step.dropoffRate}%
                  </text>
                )}
              </g>
            );
          })}
          
          {/* Legend */}
          <g transform={`translate(${margin.left}, ${height - 40})`}>
            <text className="text-xs font-medium" fill={colors.textPrimary}>
              Conversion Funnel Analysis
            </text>
            <text x="0" y="15" className="text-xs" fill={colors.textSecondary}>
              Each step shows the number of users and conversion rate from the top of the funnel
            </text>
          </g>
        </svg>
      </div>
      
      {/* Tooltip */}
      {tooltip.visible && showTooltip && tooltip.content && (
        <div
          className="absolute z-50 bg-white dark:bg-gray-800 p-3 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 pointer-events-none"
          style={{
            left: tooltip.x - 80,
            top: tooltip.y - 80,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {tooltip.content.name}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Value: {tooltip.content.displayValue}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Conversion: {tooltip.content.conversionRate}%
          </div>
          {tooltip.content.dropoffRate > 0 && (
            <div className="text-xs text-red-600 dark:text-red-400">
              Dropoff: {tooltip.content.dropoffRate}%
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FunnelChart;