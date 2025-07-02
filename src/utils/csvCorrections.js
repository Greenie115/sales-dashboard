// src/utils/csvCorrections.js
/**
 * CSV data correction and auto-fix utilities
 */

/**
 * Error types and their correction capabilities
 */
export const ERROR_TYPES = {
  MISSING_COLUMN: 'missing_column',
  EMPTY_VALUE: 'empty_value',
  INVALID_DATE: 'invalid_date',
  INVALID_NUMBER: 'invalid_number',
  INVALID_ENUM: 'invalid_enum',
  WHITESPACE: 'whitespace',
  CASE_MISMATCH: 'case_mismatch',
  TYPO: 'typo'
};

/**
 * Correction types
 */
export const CORRECTION_TYPES = {
  AUTO: 'auto',        // Can be automatically fixed
  SUGGESTED: 'suggested', // Can suggest a fix, needs user approval
  MANUAL: 'manual',    // Requires manual user input
  CRITICAL: 'critical' // Cannot be fixed, requires new data
};

/**
 * Common retailer/chain name mappings for typo correction
 */
const RETAILER_MAPPINGS = {
  'tesco': ['teso', 'tescos', 'tesc0', 'tesco '],
  'asda': ['adsa', 'asda ', 'asda.'],
  'sainsbury': ['sainsburys', 'sainsbury\'s', 'sainsburys\''],
  'morrisons': ['morisons', 'morrison', 'morrisons '],
  'waitrose': ['waitros', 'waitrose '],
  'aldi': ['aldi '],
  'lidl': ['lidl '],
  'coop': ['co-op', 'co op', 'coop '],
  'marks & spencer': ['m&s', 'marks and spencer', 'marks&spencer']
};

/**
 * Age group standardization
 */
const AGE_GROUP_MAPPINGS = {
  '16-24': ['16-24', '16 - 24', '16 to 24', '16-25', '16-23'],
  '25-34': ['25-34', '25 - 34', '25 to 34', '25-35', '25-33'],
  '35-44': ['35-44', '35 - 44', '35 to 44', '35-45', '35-43'],
  '45-54': ['45-54', '45 - 54', '45 to 54', '45-55', '45-53'],
  '55-64': ['55-64', '55 - 64', '55 to 64', '55-65', '55-63'],
  '65+': ['65+', '65 +', '65 plus', '65 and over', '65+'],
  'Under 18': ['under 18', 'under18', '<18', '< 18', 'under-18']
};

/**
 * Auto-correction functions
 */
export const AUTO_CORRECTIONS = {
  /**
   * Fix whitespace issues
   */
  trimWhitespace: (value) => {
    if (typeof value !== 'string') return value;
    return value.trim().replace(/\s+/g, ' ');
  },

  /**
   * Standardize date formats
   */
  standardizeDate: (value) => {
    if (!value) return value;
    
    const dateString = value.toString().trim();
    
    // Try different date formats
    const formats = [
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // YYYY/MM/DD
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/ // MM.DD.YYYY
    ];

    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        const [, part1, part2, part3] = match;
        
        // For YYYY-MM-DD format, already good
        if (format === formats[0]) {
          const date = new Date(dateString);
          return isNaN(date) ? value : dateString;
        }
        
        // For other formats, convert to YYYY-MM-DD
        let year, month, day;
        
        if (format === formats[1] || format === formats[2] || format === formats[4]) {
          // MM/DD/YYYY or MM-DD-YYYY or MM.DD.YYYY
          month = part1.padStart(2, '0');
          day = part2.padStart(2, '0');
          year = part3;
        } else if (format === formats[3]) {
          // YYYY/MM/DD
          year = part1;
          month = part2.padStart(2, '0');
          day = part3.padStart(2, '0');
        }
        
        const standardDate = `${year}-${month}-${day}`;
        const testDate = new Date(standardDate);
        
        if (!isNaN(testDate)) {
          return standardDate;
        }
      }
    }
    
    // Try parsing as a general date
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate)) {
      return parsedDate.toISOString().split('T')[0];
    }
    
    return value;
  },

  /**
   * Fix number formatting
   */
  standardizeNumber: (value) => {
    if (!value) return value;
    
    const stringValue = value.toString().trim();
    
    // Remove currency symbols and extra formatting
    const cleaned = stringValue
      .replace(/[£$€,\s]/g, '')
      .replace(/[^\d.-]/g, '');
    
    const number = parseFloat(cleaned);
    return isNaN(number) ? value : number.toString();
  },

  /**
   * Fix retailer name typos
   */
  fixRetailerName: (value) => {
    if (!value) return value;
    
    const cleaned = value.toString().toLowerCase().trim();
    
    for (const [standard, variants] of Object.entries(RETAILER_MAPPINGS)) {
      if (variants.some(variant => variant.toLowerCase() === cleaned)) {
        return standard;
      }
    }
    
    return AUTO_CORRECTIONS.trimWhitespace(value);
  },

  /**
   * Standardize age groups
   */
  standardizeAgeGroup: (value) => {
    if (!value) return value;
    
    const cleaned = value.toString().toLowerCase().trim();
    
    for (const [standard, variants] of Object.entries(AGE_GROUP_MAPPINGS)) {
      if (variants.some(variant => variant.toLowerCase() === cleaned)) {
        return standard;
      }
    }
    
    return value;
  },

  /**
   * Fix product name formatting
   */
  standardizeProductName: (value) => {
    if (!value) return value;
    
    return value.toString()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/['"]/g, '')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
};

/**
 * Enhanced validation result with correction capabilities
 */
export class EnhancedValidationResult {
  constructor() {
    this.isValid = true;
    this.errors = [];
    this.warnings = [];
    this.corrections = [];
    this.stats = {
      totalRows: 0,
      validRows: 0,
      errorsCount: 0,
      warningsCount: 0,
      correctableIssues: 0,
      autoFixableIssues: 0
    };
    this.correctedData = null;
    this.dataQualityScore = 100;
  }

  addError(category, message, row = null, column = null, correction = null) {
    const error = {
      type: 'error',
      category,
      message,
      row,
      column,
      correction
    };
    
    this.errors.push(error);
    this.isValid = false;
    this.stats.errorsCount++;
    
    if (correction) {
      this.stats.correctableIssues++;
      if (correction.type === CORRECTION_TYPES.AUTO) {
        this.stats.autoFixableIssues++;
      }
    }
  }

  addWarning(category, message, row = null, column = null, correction = null) {
    const warning = {
      type: 'warning',
      category,
      message,
      row,
      column,
      correction
    };
    
    this.warnings.push(warning);
    this.stats.warningsCount++;
    
    if (correction) {
      this.stats.correctableIssues++;
      if (correction.type === CORRECTION_TYPES.AUTO) {
        this.stats.autoFixableIssues++;
      }
    }
  }

  addCorrection(row, column, originalValue, correctedValue, type, description) {
    this.corrections.push({
      row,
      column,
      originalValue,
      correctedValue,
      type,
      description,
      applied: false
    });
  }

  calculateDataQualityScore() {
    if (this.stats.totalRows === 0) return 100;
    
    const totalIssues = this.stats.errorsCount + this.stats.warningsCount;
    const severity = this.stats.errorsCount * 2 + this.stats.warningsCount;
    
    this.dataQualityScore = Math.max(0, 100 - (severity / this.stats.totalRows) * 10);
    return this.dataQualityScore;
  }

  getCorrectableIssues() {
    return [...this.errors, ...this.warnings].filter(issue => issue.correction);
  }

  getAutoFixableIssues() {
    return this.getCorrectableIssues().filter(issue => 
      issue.correction?.type === CORRECTION_TYPES.AUTO
    );
  }
}

/**
 * Apply corrections to CSV data
 */
export const applyCorrectionsToCsvData = (csvData, corrections) => {
  if (!csvData || !corrections || corrections.length === 0) {
    return csvData;
  }

  const correctedData = csvData.map((row, rowIndex) => {
    const newRow = { ...row };
    
    corrections.forEach(correction => {
      if (correction.applied && correction.row === rowIndex + 1) {
        newRow[correction.column] = correction.correctedValue;
      }
    });
    
    return newRow;
  });

  return correctedData;
};

/**
 * Auto-apply all possible corrections
 */
export const autoApplyCorrections = (validationResult) => {
  const autoFixable = validationResult.getAutoFixableIssues();
  
  autoFixable.forEach(issue => {
    const correction = validationResult.corrections.find(c => 
      c.row === issue.row && c.column === issue.column
    );
    
    if (correction) {
      correction.applied = true;
    }
  });

  return validationResult;
};

/**
 * Generate correction suggestions for common issues
 */
export const generateCorrectionSuggestions = (value, column, dataType) => {
  const suggestions = [];
  
  if (!value || value.toString().trim() === '') {
    return [{
      type: CORRECTION_TYPES.MANUAL,
      suggestedValue: '',
      description: 'This field cannot be empty. Please provide a value.',
      confidence: 0
    }];
  }

  const stringValue = value.toString();
  
  // Date corrections
  if (column.toLowerCase().includes('date') || column === 'receipt_date' || column === 'created_at') {
    const standardDate = AUTO_CORRECTIONS.standardizeDate(stringValue);
    if (standardDate !== stringValue) {
      suggestions.push({
        type: CORRECTION_TYPES.AUTO,
        suggestedValue: standardDate,
        description: `Convert to standard date format (YYYY-MM-DD)`,
        confidence: 0.9
      });
    }
  }

  // Number corrections
  if (column.toLowerCase().includes('total') || column.toLowerCase().includes('amount')) {
    const standardNumber = AUTO_CORRECTIONS.standardizeNumber(stringValue);
    if (standardNumber !== stringValue) {
      suggestions.push({
        type: CORRECTION_TYPES.AUTO,
        suggestedValue: standardNumber,
        description: `Clean number formatting`,
        confidence: 0.8
      });
    }
  }

  // Retailer name corrections
  if (column.toLowerCase().includes('chain') || column.toLowerCase().includes('retailer')) {
    const fixedRetailer = AUTO_CORRECTIONS.fixRetailerName(stringValue);
    if (fixedRetailer !== stringValue) {
      suggestions.push({
        type: CORRECTION_TYPES.SUGGESTED,
        suggestedValue: fixedRetailer,
        description: `Fix retailer name`,
        confidence: 0.7
      });
    }
  }

  // Age group corrections
  if (column.toLowerCase().includes('age')) {
    const standardAge = AUTO_CORRECTIONS.standardizeAgeGroup(stringValue);
    if (standardAge !== stringValue) {
      suggestions.push({
        type: CORRECTION_TYPES.AUTO,
        suggestedValue: standardAge,
        description: `Standardize age group format`,
        confidence: 0.9
      });
    }
  }

  // Product name corrections
  if (column.toLowerCase().includes('product')) {
    const standardProduct = AUTO_CORRECTIONS.standardizeProductName(stringValue);
    if (standardProduct !== stringValue) {
      suggestions.push({
        type: CORRECTION_TYPES.SUGGESTED,
        suggestedValue: standardProduct,
        description: `Standardize product name formatting`,
        confidence: 0.6
      });
    }
  }

  // Whitespace corrections
  const trimmed = AUTO_CORRECTIONS.trimWhitespace(stringValue);
  if (trimmed !== stringValue) {
    suggestions.push({
      type: CORRECTION_TYPES.AUTO,
      suggestedValue: trimmed,
      description: `Remove extra whitespace`,
      confidence: 0.95
    });
  }

  return suggestions;
};

export default {
  ERROR_TYPES,
  CORRECTION_TYPES,
  AUTO_CORRECTIONS,
  EnhancedValidationResult,
  applyCorrectionsToCsvData,
  autoApplyCorrections,
  generateCorrectionSuggestions
};