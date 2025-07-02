import React, { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useChartColors } from '../../utils/chartColors';

const HeatmapChart = ({ 
  data = [], 
  width = 800, 
  height = 400, 
  title = "Heatmap",
  xAxisLabel = "X Axis",
  yAxisLabel = "Y Axis",
  valueLabel = "Value",
  cellSize = 40,
  showLabels = true,
  showTooltip = true 
}) => {
  const { darkMode } = useTheme();
  const colors = useChartColors();

  const { processedData, maxValue, minValue, xLabels, yLabels } = useMemo(() => {
    if (!data || data.length === 0) {
      return { processedData: [], maxValue: 0, minValue: 0, xLabels: [], yLabels: [] };
    }

    const xLabels = [...new Set(data.map(d => d.x))].sort();
    const yLabels = [...new Set(data.map(d => d.y))].sort();
    
    const dataMap = new Map();
    data.forEach(d => {
      dataMap.set(`${d.x}-${d.y}`, d.value || 0);
    });

    const processedData = [];
    const values = [];
    
    yLabels.forEach((y, yIndex) => {
      xLabels.forEach((x, xIndex) => {
        const value = dataMap.get(`${x}-${y}`) || 0;
        values.push(value);
        processedData.push({
          x,
          y,
          xIndex,
          yIndex,
          value,
          displayValue: typeof value === 'number' ? value.toLocaleString() : value
        });
      });
    });

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);

    return { processedData, maxValue, minValue, xLabels, yLabels };
  }, [data]);

  const getHeatmapColor = (value) => {
    if (maxValue === minValue) return colors.primary;
    
    const intensity = (value - minValue) / (maxValue - minValue);
    
    if (darkMode) {
      // Dark mode: use blue to pink gradient
      const r = Math.round(59 + (255 - 59) * intensity);  // 59 -> 255 (from blue to pink)
      const g = Math.round(130 - 130 * intensity);         // 130 -> 0 (reduce green)
      const b = Math.round(246 - (246 - 133) * intensity); // 246 -> 133 (from blue to pink)
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Light mode: use light blue to dark blue gradient
      const r = Math.round(239 - (239 - 0) * intensity);   // Light to dark
      const g = Math.round(246 - (246 - 102) * intensity); // Light to dark
      const b = Math.round(255 - (255 - 204) * intensity); // Light to dark
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const margin = { top: 60, right: 100, bottom: 80, left: 120 };
  const chartWidth = xLabels.length * cellSize;
  const chartHeight = yLabels.length * cellSize;
  const totalWidth = chartWidth + margin.left + margin.right;
  const totalHeight = chartHeight + margin.top + margin.bottom;

  const [tooltip, setTooltip] = React.useState({ visible: false, x: 0, y: 0, content: '' });

  const handleCellHover = (event, cellData) => {
    if (!showTooltip) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      content: {
        x: cellData.x,
        y: cellData.y,
        value: cellData.displayValue
      }
    });
  };

  const handleCellLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, content: '' });
  };

  return (
    <div className="relative w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
          {title}
        </h3>
      )}
      
      <div className="flex justify-center overflow-x-auto">
        <svg width={totalWidth} height={totalHeight} className="heatmap-chart">
          <defs>
            <filter id="cellShadow">
              <feDropShadow dx="1" dy="1" stdDeviation="1" floodOpacity="0.2" />
            </filter>
          </defs>
          
          {/* Y-axis label */}
          <text
            x={20}
            y={totalHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, 20, ${totalHeight / 2})`}
            className="text-sm font-medium"
            fill={colors.textPrimary}
          >
            {yAxisLabel}
          </text>
          
          {/* X-axis label */}
          <text
            x={totalWidth / 2}
            y={totalHeight - 20}
            textAnchor="middle"
            className="text-sm font-medium"
            fill={colors.textPrimary}
          >
            {xAxisLabel}
          </text>
          
          {/* Y-axis labels */}
          {yLabels.map((label, index) => (
            <text
              key={`y-label-${index}`}
              x={margin.left - 10}
              y={margin.top + index * cellSize + cellSize / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-xs"
              fill={colors.textSecondary}
            >
              {label}
            </text>
          ))}
          
          {/* X-axis labels */}
          {xLabels.map((label, index) => (
            <text
              key={`x-label-${index}`}
              x={margin.left + index * cellSize + cellSize / 2}
              y={margin.top + chartHeight + 20}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs"
              fill={colors.textSecondary}
              transform={`rotate(-45, ${margin.left + index * cellSize + cellSize / 2}, ${margin.top + chartHeight + 20})`}
            >
              {label}
            </text>
          ))}
          
          {/* Heatmap cells */}
          {processedData.map((cell, index) => (
            <g key={`cell-${index}`}>
              <rect
                x={margin.left + cell.xIndex * cellSize}
                y={margin.top + cell.yIndex * cellSize}
                width={cellSize - 1}
                height={cellSize - 1}
                fill={getHeatmapColor(cell.value)}
                stroke={darkMode ? '#374151' : '#e5e7eb'}
                strokeWidth={0.5}
                rx={2}
                className="transition-all duration-200 hover:brightness-110 cursor-pointer"
                filter="url(#cellShadow)"
                onMouseEnter={(e) => handleCellHover(e, cell)}
                onMouseLeave={handleCellLeave}
              />
              {showLabels && cell.value > 0 && (
                <text
                  x={margin.left + cell.xIndex * cellSize + cellSize / 2}
                  y={margin.top + cell.yIndex * cellSize + cellSize / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-medium pointer-events-none"
                  fill={cell.value > (maxValue * 0.5) ? '#ffffff' : colors.textPrimary}
                >
                  {cell.displayValue}
                </text>
              )}
            </g>
          ))}
          
          {/* Legend */}
          <g transform={`translate(${totalWidth - 80}, ${margin.top})`}>
            <text
              x={0}
              y={-10}
              className="text-xs font-medium"
              fill={colors.textPrimary}
            >
              {valueLabel}
            </text>
            {[0, 0.25, 0.5, 0.75, 1].map((intensity, index) => {
              const value = minValue + (maxValue - minValue) * intensity;
              return (
                <g key={`legend-${index}`} transform={`translate(0, ${index * 25})`}>
                  <rect
                    x={0}
                    y={0}
                    width={15}
                    height={15}
                    fill={getHeatmapColor(value)}
                    stroke={darkMode ? '#374151' : '#e5e7eb'}
                    strokeWidth={0.5}
                    rx={2}
                  />
                  <text
                    x={20}
                    y={12}
                    className="text-xs"
                    fill={colors.textSecondary}
                  >
                    {Math.round(value).toLocaleString()}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      
      {/* Tooltip */}
      {tooltip.visible && showTooltip && (
        <div
          className="absolute z-50 bg-white dark:bg-gray-800 p-2 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 pointer-events-none"
          style={{
            left: tooltip.x - 60,
            top: tooltip.y - 60,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {xAxisLabel}: {tooltip.content.x}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {yAxisLabel}: {tooltip.content.y}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {valueLabel}: {tooltip.content.value}
          </div>
        </div>
      )}
    </div>
  );
};

export default HeatmapChart;