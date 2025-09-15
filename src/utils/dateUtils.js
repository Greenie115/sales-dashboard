// src/utils/dateUtils.js
/**
 * Robust date parsing utilities to handle various CSV date formats
 */

/**
 * Common date format patterns and their regex
 */
const DATE_PATTERNS = [
  // ISO formats
  { 
    pattern: /^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{1,2}):(\d{1,2})\.?\d*Z?$/,
    parser: (match) => {
      const [, year, month, day, hour = 0, minute = 0, second = 0] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
    }
  },
  { 
    pattern: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    parser: (match) => {
      const [, year, month, day] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  },
  
  // US formats (MM/DD/YYYY, MM-DD-YYYY)
  { 
    pattern: /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
    parser: (match) => {
      const [, month, day, year] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  },
  
  // European formats (DD/MM/YYYY, DD-MM-YYYY)
  { 
    pattern: /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
    parser: (match, isEuropean = false) => {
      const [, first, second, year] = match;
      if (isEuropean) {
        // DD/MM/YYYY
        return new Date(parseInt(year), parseInt(second) - 1, parseInt(first));
      } else {
        // MM/DD/YYYY (default US format)
        return new Date(parseInt(year), parseInt(first) - 1, parseInt(second));
      }
    }
  },
  
  // Short year formats
  { 
    pattern: /^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/,
    parser: (match) => {
      const [, month, day, shortYear] = match;
      const year = parseInt(shortYear) > 30 ? 1900 + parseInt(shortYear) : 2000 + parseInt(shortYear);
      return new Date(year, parseInt(month) - 1, parseInt(day));
    }
  }
];

/**
 * Safely parse a date string with multiple format support
 * @param {string} dateString - The date string to parse
 * @param {Object} options - Parsing options
 * @returns {Date|null} - Parsed date or null if invalid
 */
export const safeParseDate = (dateString, options = {}) => {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const { 
    preferEuropean = false,
    allowFutureDates = true,
    maxFutureYears = 1,
    minYear = 1990 
  } = options;

  const trimmed = dateString.trim();
  
  // First try native Date parsing
  try {
    const nativeDate = new Date(trimmed);
    if (!isNaN(nativeDate.getTime())) {
      const now = new Date();
      const maxDate = new Date(now.getFullYear() + maxFutureYears, 11, 31);
      const minDate = new Date(minYear, 0, 1);
      
      if (nativeDate >= minDate && (allowFutureDates ? nativeDate <= maxDate : nativeDate <= now)) {
        return nativeDate;
      }
    }
  } catch (e) {
    // Continue to pattern matching
  }

  // Try pattern matching
  for (const { pattern, parser } of DATE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      try {
        const date = parser(match, preferEuropean);
        
        if (!isNaN(date.getTime())) {
          const now = new Date();
          const maxDate = new Date(now.getFullYear() + maxFutureYears, 11, 31);
          const minDate = new Date(minYear, 0, 1);
          
          if (date >= minDate && (allowFutureDates ? date <= maxDate : date <= now)) {
            return date;
          }
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }

  // If no pattern matches, log and return null
  console.warn(`Unable to parse date: "${trimmed}"`);
  return null;
};

/**
 * Safely convert a date to ISO date string
 * @param {Date|string} date - Date object or string to convert
 * @returns {string|null} - ISO date string (YYYY-MM-DD) or null if invalid
 */
export const safeToISOString = (date) => {
  if (!date) return null;
  
  try {
    let dateObj = date;
    
    // If it's a string, parse it first
    if (typeof date === 'string') {
      dateObj = safeParseDate(date);
      if (!dateObj) return null;
    }
    
    // Validate it's a valid date object
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return null;
    }
    
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.warn('Error converting date to ISO string:', error);
    return null;
  }
};

/**
 * Safely extract date components
 * @param {Date|string} date - Date object or string
 * @returns {Object|null} - Date components or null if invalid
 */
export const safeDateComponents = (date) => {
  if (!date) return null;
  
  try {
    let dateObj = date;
    
    if (typeof date === 'string') {
      dateObj = safeParseDate(date);
      if (!dateObj) return null;
    }
    
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return null;
    }
    
    const isoString = dateObj.toISOString();
    
    return {
      date: dateObj,
      isoString: isoString,
      dateString: isoString.split('T')[0], // YYYY-MM-DD
      monthString: isoString.slice(0, 7),  // YYYY-MM
      dayOfWeek: dateObj.getDay(),         // 0 = Sunday
      hourOfDay: dateObj.getHours(),       // 0-23
      year: dateObj.getFullYear(),
      month: dateObj.getMonth() + 1,       // 1-12
      day: dateObj.getDate()               // 1-31
    };
  } catch (error) {
    console.warn('Error extracting date components:', error);
    return null;
  }
};

/**
 * Detect likely date format from sample data with improved ISO detection
 * @param {Array} sampleDates - Array of sample date strings
 * @returns {string} - Detected format ('ISO', 'US', 'EU', 'unknown')
 */
export const detectDateFormat = (sampleDates) => {
  if (!sampleDates || sampleDates.length === 0) return 'unknown';
  
  let isoCount = 0;
  let isoTimeCount = 0;
  let usCount = 0;
  let euCount = 0;
  let totalValidDates = 0;
  
  sampleDates.slice(0, 15).forEach(dateStr => {
    if (!dateStr) return;
    
    const trimmed = dateStr.toString().trim();
    
    // Check for ISO date format (YYYY-MM-DD)
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
      isoCount++;
      totalValidDates++;
    }
    // Check for ISO datetime format (YYYY-MM-DDTHH:mm:ss)
    else if (/^\d{4}-\d{1,2}-\d{1,2}T\d{1,2}:\d{1,2}:\d{1,2}/.test(trimmed)) {
      isoTimeCount++;
      totalValidDates++;
    }
    // Check for US/EU format (MM/DD or DD/MM patterns)
    else if (/^(\d{1,2})[/-](\d{1,2})[/-]\d{4}$/.test(trimmed)) {
      const [, first, second] = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-]\d{4}$/);
      const firstNum = parseInt(first);
      const secondNum = parseInt(second);
      
      if (firstNum > 12) {
        euCount++; // Must be DD/MM
        totalValidDates++;
      } else if (secondNum > 12) {
        usCount++; // Must be MM/DD
        totalValidDates++;
      } else {
        // Ambiguous - could be either, lean towards US as default
        usCount++;
        totalValidDates++;
      }
    }
  });
  
  // Prioritize ISO formats (including datetime)
  const totalIsoCount = isoCount + isoTimeCount;
  if (totalIsoCount > 0 && totalIsoCount >= totalValidDates * 0.7) {
    return 'ISO';
  }
  
  if (usCount > euCount && usCount > totalIsoCount) return 'US';
  if (euCount > 0 && euCount >= usCount) return 'EU';
  if (totalIsoCount > 0) return 'ISO';
  
  return 'unknown';
};

/**
 * Batch process dates from CSV data
 * @param {Array} data - Array of data objects
 * @param {string} dateField - Field name containing date
 * @param {Object} options - Parsing options
 * @returns {Object} - {processedData, invalidCount, detectedFormat}
 */
export const batchProcessDates = (data, dateField = 'receipt_date', options = {}) => {
  if (!data || !Array.isArray(data)) {
    return { processedData: [], invalidCount: 0, detectedFormat: 'unknown' };
  }
  
  // Sample dates for format detection
  const sampleDates = data
    .slice(0, 30) // Increase sample size for better detection
    .map(row => row[dateField])
    .filter(Boolean);
    
  const detectedFormat = detectDateFormat(sampleDates);
  const parseOptions = {
    ...options,
    preferEuropean: detectedFormat === 'EU',
    // Be more lenient with date ranges for CSV data
    maxFutureYears: 2,
    minYear: 1980
  };
  
  let invalidCount = 0;
  
  const processedData = data.map(row => {
    if (!row[dateField]) return row;
    
    const dateValue = row[dateField];
    
    // Skip processing if the date is already in ISO format and has derived fields
    if (detectedFormat === 'ISO' && 
        /^\d{4}-\d{2}-\d{2}$/.test(dateValue) &&
        row.month && row.day_of_week !== undefined) {
      return row;
    }
    
    const parsedDate = safeParseDate(dateValue, parseOptions);
    
    if (!parsedDate) {
      // Only count as invalid if we can't parse it at all
      // For ISO format, be more lenient
      if (detectedFormat === 'ISO' && /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
        // Try to keep ISO dates even if we can't fully parse them
        return {
          ...row,
          month: dateValue.slice(0, 7), // YYYY-MM
          day_of_week: 0, // Default
          hour_of_day: 0  // Default
        };
      }
      
      invalidCount++;
      console.warn(`Invalid date in row:`, dateValue);
      return row; // Keep original row with original date
    }
    
    const dateComponents = safeDateComponents(parsedDate);
    
    return {
      ...row,
      [dateField]: dateComponents.dateString,
      month: dateComponents.monthString,
      day_of_week: dateComponents.dayOfWeek,
      hour_of_day: dateComponents.hourOfDay
    };
  });
  
  return {
    processedData,
    invalidCount,
    detectedFormat
  };
};