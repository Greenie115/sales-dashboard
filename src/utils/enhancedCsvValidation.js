// src/utils/enhancedCsvValidation.js
/**
 * Enhanced CSV validation with correction capabilities
 */

import { 
  EnhancedValidationResult, 
  generateCorrectionSuggestions,
  AUTO_CORRECTIONS,
  CORRECTION_TYPES 
} from './csvCorrections';

/**
 * Enhanced CSV schemas with correction hints
 */
export const ENHANCED_CSV_SCHEMAS = {
  sales: {
    requiredColumns: ['receipt_date', 'product_name', 'chain'],
    optionalColumns: ['receipt_total', 'user_id', 'offer_id'],
    columnValidators: {
      receipt_date: {
        validate: (value) => !isNaN(Date.parse(value)),
        message: 'Must be a valid date',
        correctable: true,
        correctionHint: 'date_format'
      },
      product_name: {
        validate: (value) => value && value.trim().length > 0,
        message: 'Cannot be empty',
        correctable: false,
        correctionHint: 'manual_input'
      },
      chain: {
        validate: (value) => value && value.trim().length > 0,
        message: 'Cannot be empty',
        correctable: true,
        correctionHint: 'retailer_mapping'
      },
      receipt_total: {
        validate: (value) => !value || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0),
        message: 'Must be a positive number or empty',
        correctable: true,
        correctionHint: 'number_format'
      }
    }
  },
  offers: {
    requiredColumns: ['hit_id', 'created_at'],
    optionalColumns: ['offer_name', 'user_id', 'gender', 'age_group'],
    columnValidators: {
      hit_id: {
        validate: (value) => value && value.trim().length > 0,
        message: 'Cannot be empty',
        correctable: false,
        correctionHint: 'manual_input'
      },
      created_at: {
        validate: (value) => !isNaN(Date.parse(value)),
        message: 'Must be a valid date',
        correctable: true,
        correctionHint: 'date_format'
      },
      age_group: {
        validate: (value) => !value || ['16-24', '25-34', '35-44', '45-54', '55-64', '65+', 'Under 18'].includes(value),
        message: 'Must be one of: 16-24, 25-34, 35-44, 45-54, 55-64, 65+, Under 18',
        correctable: true,
        correctionHint: 'age_group_mapping'
      },
      gender: {
        validate: (value) => !value || ['male', 'female', 'other', 'prefer not to say'].includes(value.toLowerCase()),
        message: 'Must be one of: male, female, other, prefer not to say',
        correctable: true,
        correctionHint: 'gender_mapping'
      }
    }
  }
};

/**
 * Detect CSV data type based on columns
 */
export const detectDataType = (headers) => {
  const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));
  
  if (headerSet.has('receipt_date') && headerSet.has('product_name')) {
    return 'sales';
  }
  
  if (headerSet.has('hit_id') || headerSet.has('offer_id') || headerSet.has('created_at')) {
    return 'offers';
  }
  
  if (headerSet.has('age_group') || headerSet.has('gender')) {
    return 'demographics';
  }
  
  return 'unknown';
};

/**
 * Enhanced CSV validation with correction suggestions
 */
export const validateCSVWithCorrections = (csvData, expectedType = null) => {
  const result = new EnhancedValidationResult();
  
  // Basic structure validation
  if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
    result.addError('structure', 'CSV file is empty or invalid');
    return result;
  }

  // Get headers from first row
  const headers = Object.keys(csvData[0]);
  if (headers.length === 0) {
    result.addError('structure', 'No columns found in CSV file');
    return result;
  }

  // Detect data type if not provided
  const dataType = expectedType || detectDataType(headers);
  const schema = ENHANCED_CSV_SCHEMAS[dataType];
  
  if (!schema) {
    result.addWarning('structure', `Unknown data type detected. Using generic validation.`);
  } else {
    // Validate required columns
    const missingColumns = schema.requiredColumns.filter(col => 
      !headers.some(header => header.toLowerCase().trim() === col.toLowerCase())
    );
    
    if (missingColumns.length > 0) {
      result.addError('columns', `Missing required columns: ${missingColumns.join(', ')}`, null, null, {
        type: CORRECTION_TYPES.CRITICAL,
        suggestedValue: null,
        description: 'Add missing columns to your CSV file'
      });
    }
  }

  // Validate data rows
  result.stats.totalRows = csvData.length;
  
  csvData.forEach((row, index) => {
    const rowNumber = index + 1;
    let hasValidData = false;
    let rowErrors = 0;

    // Check if row is empty
    const isEmpty = Object.values(row).every(value => 
      !value || value.toString().trim() === ''
    );

    if (isEmpty) {
      result.stats.emptyRows++;
      result.addWarning('data', `Row ${rowNumber} is empty`, rowNumber);
      return;
    }

    // Validate each column
    Object.entries(row).forEach(([column, value]) => {
      const cleanColumn = column.toLowerCase().trim();
      
      if (schema && schema.columnValidators && schema.columnValidators[cleanColumn]) {
        const validator = schema.columnValidators[cleanColumn];
        
        if (!validator.validate(value)) {
          // Generate correction suggestions
          const suggestions = generateCorrectionSuggestions(value, cleanColumn, dataType);
          const bestSuggestion = suggestions.length > 0 ? suggestions[0] : null;
          
          const correction = bestSuggestion ? {
            type: bestSuggestion.type,
            suggestedValue: bestSuggestion.suggestedValue,
            description: bestSuggestion.description,
            confidence: bestSuggestion.confidence || 0.5
          } : validator.correctable ? {
            type: CORRECTION_TYPES.MANUAL,
            suggestedValue: '',
            description: 'Manual correction required'
          } : null;

          result.addError('data', 
            `Row ${rowNumber}, Column "${column}": ${validator.message}. Got: "${value}"`,
            rowNumber, 
            column,
            correction
          );
          
          // Add to corrections list if correctable
          if (correction && correction.suggestedValue !== '') {
            result.addCorrection(
              rowNumber,
              column,
              value,
              correction.suggestedValue,
              correction.type,
              correction.description
            );
          }
          
          rowErrors++;
        } else {
          hasValidData = true;
        }
      } else if (value && value.toString().trim() !== '') {
        hasValidData = true;
        
        // Check for potential improvements even for valid data
        const suggestions = generateCorrectionSuggestions(value, cleanColumn, dataType);
        if (suggestions.length > 0 && suggestions[0].confidence > 0.8) {
          const suggestion = suggestions[0];
          result.addWarning('data',
            `Row ${rowNumber}, Column "${column}": Suggested improvement available`,
            rowNumber,
            column,
            {
              type: suggestion.type,
              suggestedValue: suggestion.suggestedValue,
              description: suggestion.description
            }
          );
          
          result.addCorrection(
            rowNumber,
            column,
            value,
            suggestion.suggestedValue,
            suggestion.type,
            suggestion.description
          );
        }
      }
    });

    // Check for suspiciously long text
    Object.entries(row).forEach(([column, value]) => {
      if (value && value.toString().length > 500) {
        result.addWarning('data', 
          `Row ${rowNumber}, Column "${column}": Very long value (${value.toString().length} characters)`,
          rowNumber,
          column
        );
      }
    });

    if (hasValidData && rowErrors === 0) {
      result.stats.validRows++;
    }
  });

  // Additional validation checks
  validateDataConsistencyWithCorrections(csvData, result);
  
  // Calculate data quality score
  result.calculateDataQualityScore();
  
  return result;
};

/**
 * Validate data consistency with correction suggestions
 */
const validateDataConsistencyWithCorrections = (csvData, result) => {
  if (csvData.length < 2) return;

  const headers = Object.keys(csvData[0]);
  
  // Check for inconsistent column counts
  csvData.forEach((row, index) => {
    const rowHeaders = Object.keys(row);
    if (rowHeaders.length !== headers.length) {
      result.addWarning('consistency', 
        `Row ${index + 1} has ${rowHeaders.length} columns, expected ${headers.length}`,
        index + 1
      );
    }
  });

  // Check for date format consistency with auto-fix suggestions
  const dateColumns = headers.filter(header => 
    header.toLowerCase().includes('date') || header.toLowerCase().includes('created_at')
  );

  dateColumns.forEach(column => {
    const formats = new Set();
    const nonStandardDates = [];
    
    csvData.forEach((row, index) => {
      const value = row[column];
      if (value) {
        const standardDate = AUTO_CORRECTIONS.standardizeDate(value);
        if (standardDate !== value && !isNaN(Date.parse(standardDate))) {
          nonStandardDates.push({
            row: index + 1,
            original: value,
            suggested: standardDate
          });
        }
        
        // Detect format patterns
        if (value.includes('/')) formats.add('MM/DD/YYYY');
        else if (value.includes('-') && value.length === 10) formats.add('YYYY-MM-DD');
        else if (value.includes('-') && value.length > 10) formats.add('YYYY-MM-DD HH:MM:SS');
        else formats.add('other');
      }
    });

    if (formats.size > 1) {
      result.addWarning('consistency', 
        `Column "${column}" has mixed date formats: ${Array.from(formats).join(', ')}`,
        null,
        column,
        {
          type: CORRECTION_TYPES.AUTO,
          suggestedValue: 'YYYY-MM-DD',
          description: 'Standardize all dates to YYYY-MM-DD format'
        }
      );
    }

    // Add individual date corrections
    nonStandardDates.forEach(dateInfo => {
      result.addCorrection(
        dateInfo.row,
        column,
        dateInfo.original,
        dateInfo.suggested,
        CORRECTION_TYPES.AUTO,
        'Standardize date format to YYYY-MM-DD'
      );
    });
  });

  // Check retailer name consistency
  const chainColumns = headers.filter(header => 
    header.toLowerCase().includes('chain') || header.toLowerCase().includes('retailer')
  );

  chainColumns.forEach(column => {
    const retailers = new Map();
    
    csvData.forEach((row, index) => {
      const value = row[column];
      if (value) {
        const cleaned = value.toString().toLowerCase().trim();
        const fixed = AUTO_CORRECTIONS.fixRetailerName(value);
        
        if (fixed !== value) {
          result.addCorrection(
            index + 1,
            column,
            value,
            fixed,
            CORRECTION_TYPES.SUGGESTED,
            'Fix retailer name spelling'
          );
        }
        
        if (!retailers.has(cleaned)) {
          retailers.set(cleaned, []);
        }
        retailers.get(cleaned).push({ row: index + 1, value });
      }
    });

    // Check for potential duplicates with different spellings
    const retailerNames = Array.from(retailers.keys());
    for (let i = 0; i < retailerNames.length; i++) {
      for (let j = i + 1; j < retailerNames.length; j++) {
        const name1 = retailerNames[i];
        const name2 = retailerNames[j];
        
        // Simple similarity check
        if (levenshteinDistance(name1, name2) <= 2 && Math.abs(name1.length - name2.length) <= 2) {
          result.addWarning('consistency',
            `Potential duplicate retailers with different spellings: "${name1}" and "${name2}"`,
            null,
            column,
            {
              type: CORRECTION_TYPES.MANUAL,
              suggestedValue: name1.length <= name2.length ? name1 : name2,
              description: 'Review and standardize retailer names'
            }
          );
        }
      }
    }
  });
};

/**
 * Simple Levenshtein distance calculation
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Generate a summary of available corrections
 */
export const generateCorrectionSummary = (validationResult) => {
  const corrections = validationResult.corrections;
  const summary = {
    total: corrections.length,
    autoFixable: corrections.filter(c => c.type === CORRECTION_TYPES.AUTO).length,
    suggested: corrections.filter(c => c.type === CORRECTION_TYPES.SUGGESTED).length,
    manual: corrections.filter(c => c.type === CORRECTION_TYPES.MANUAL).length,
    byCategory: {},
    estimatedTimeToFix: 0
  };

  // Categorize corrections
  corrections.forEach(correction => {
    const key = `${correction.type}_${correction.description}`;
    if (!summary.byCategory[key]) {
      summary.byCategory[key] = {
        type: correction.type,
        description: correction.description,
        count: 0,
        examples: []
      };
    }
    summary.byCategory[key].count++;
    if (summary.byCategory[key].examples.length < 3) {
      summary.byCategory[key].examples.push({
        row: correction.row,
        column: correction.column,
        original: correction.originalValue,
        suggested: correction.correctedValue
      });
    }
  });

  // Estimate time to fix (rough estimates in minutes)
  summary.estimatedTimeToFix = 
    summary.autoFixable * 0.1 + // Auto fixes are instant
    summary.suggested * 0.5 +   // Suggested fixes need review
    summary.manual * 2;         // Manual fixes take longer

  return summary;
};

export default {
  validateCSVWithCorrections,
  generateCorrectionSummary,
  ENHANCED_CSV_SCHEMAS
};