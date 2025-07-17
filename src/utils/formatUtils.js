// src/utils/formatUtils.js
/**
 * Lightweight formatting utilities that don't require heavy dependencies
 */

// Format date to "24 Feb 2025" style
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = date.getDate().toString();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  } catch (error) {
    return dateString;
  }
};

// Format month for display (e.g., "2023-01" to "January 2023")
export const formatMonth = (monthStr) => {
  try {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  } catch (e) {
    return monthStr;
  }
};

/**
 * Format currency values in GBP
 */
export const formatGBP = (amount, options = {}) => {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showSymbol = true
  } = options;
  
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? '£0.00' : '0.00';
  }
  
  const formattedNumber = Number(amount).toLocaleString('en-GB', {
    minimumFractionDigits,
    maximumFractionDigits
  });
  
  return showSymbol ? `£${formattedNumber}` : formattedNumber;
};

/**
 * Format large currency values with abbreviated units (e.g., £1.2K, £1.5M)
 */
export const formatGBPCompact = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '£0';
  }
  
  const num = Number(amount);
  
  if (num >= 1000000) {
    return `£${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `£${(num / 1000).toFixed(1)}K`;
  } else {
    return `£${num.toFixed(0)}`;
  }
};

/**
 * Format currency for different contexts
 */
export const formatCurrency = (amount, context = 'default') => {
  switch (context) {
    case 'compact':
      return formatGBPCompact(amount);
    case 'whole':
      return formatGBP(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    case 'precise':
      return formatGBP(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'table':
      return formatGBP(amount, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    default:
      return formatGBP(amount);
  }
};

// The preferred sorting order for age groups
export const AGE_GROUP_ORDER = [
  '16-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
  'Under 18'
];