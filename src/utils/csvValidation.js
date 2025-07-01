// src/utils/csvValidation.js
/**
 * Comprehensive CSV validation utilities with detailed error reporting
 */

/**
 * Expected CSV schemas for different data types
 */
export const CSV_SCHEMAS = {
  sales: {
    requiredColumns: ['receipt_date', 'product_name', 'chain'],
    optionalColumns: ['receipt_total', 'user_id', 'offer_id'],
    columnValidators: {
      receipt_date: {
        validate: (value) => !isNaN(Date.parse(value)),
        message: 'Must be a valid date (YYYY-MM-DD format recommended)'
      },
      product_name: {
        validate: (value) => value && value.trim().length > 0,
        message: 'Cannot be empty'
      },
      chain: {
        validate: (value) => value && value.trim().length > 0,
        message: 'Cannot be empty'
      },
      receipt_total: {
        validate: (value) => !value || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0),
        message: 'Must be a positive number or empty'
      }
    }
  },
  offers: {
    requiredColumns: ['hit_id', 'created_at'],
    optionalColumns: ['offer_name', 'user_id', 'gender', 'age_group'],
    columnValidators: {
      hit_id: {
        validate: (value) => value && value.trim().length > 0,
        message: 'Cannot be empty'
      },
      created_at: {
        validate: (value) => !isNaN(Date.parse(value)),
        message: 'Must be a valid date (YYYY-MM-DD HH:MM:SS format recommended)'
      },
      age_group: {
        validate: (value) => !value || ['16-24', '25-34', '35-44', '45-54', '55-64', '65+', 'Under 18'].includes(value),
        message: 'Must be one of: 16-24, 25-34, 35-44, 45-54, 55-64, 65+, Under 18'
      }
    }
  },
  demographics: {
    requiredColumns: ['user_id'],
    optionalColumns: ['age_group', 'gender', 'location'],
    columnValidators: {
      user_id: {
        validate: (value) => value && value.trim().length > 0,
        message: 'Cannot be empty'
      }
    }
  }
};

/**
 * Validation result structure
 */
export class ValidationResult {
  constructor() {
    this.isValid = true;
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      emptyRows: 0
    };
  }

  addError(type, message, row = null, column = null) {
    this.isValid = false;
    this.errors.push({
      type,
      message,
      row,
      column,
      severity: 'error'
    });
  }

  addWarning(type, message, row = null, column = null) {
    this.warnings.push({
      type,
      message,
      row,
      column,
      severity: 'warning'
    });
  }
}

/**
 * Detect CSV data type based on columns
 */
export const detectDataType = (headers) => {
  const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));
  
  // Check for sales data
  if (headerSet.has('receipt_date') && headerSet.has('product_name')) {
    return 'sales';
  }
  
  // Check for offers data
  if (headerSet.has('hit_id') || headerSet.has('offer_id') || headerSet.has('created_at')) {
    return 'offers';
  }
  
  // Check for demographics data
  if (headerSet.has('age_group') || headerSet.has('gender')) {
    return 'demographics';
  }
  
  return 'unknown';
};

/**
 * Validate CSV structure and content
 */
export const validateCSV = (csvData, expectedType = null) => {
  const result = new ValidationResult();
  
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
  const schema = CSV_SCHEMAS[dataType];
  
  if (!schema) {
    result.addWarning('structure', `Unknown data type detected. Using generic validation.`);
  } else {
    // Validate required columns
    const missingColumns = schema.requiredColumns.filter(col => 
      !headers.some(header => header.toLowerCase().trim() === col.toLowerCase())
    );
    
    if (missingColumns.length > 0) {
      result.addError('columns', `Missing required columns: ${missingColumns.join(', ')}`);
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
          result.addError('data', 
            `Row ${rowNumber}, Column "${column}": ${validator.message}. Got: "${value}"`,
            rowNumber, 
            column
          );
          rowErrors++;
        } else {
          hasValidData = true;
        }
      } else if (value && value.toString().trim() !== '') {
        hasValidData = true;
      }
    });

    // Check for suspiciously long text that might be encoded data
    Object.entries(row).forEach(([column, value]) => {
      if (value && value.toString().length > 500) {
        result.addWarning('data', 
          `Row ${rowNumber}, Column "${column}": Very long value (${value.toString().length} characters). This might be encoded data.`,
          rowNumber,
          column
        );
      }
    });

    if (hasValidData && rowErrors === 0) {
      result.stats.validRows++;
    } else if (rowErrors > 0) {
      result.stats.invalidRows++;
    }
  });

  // Additional validation checks
  validateDataConsistency(csvData, result);
  
  return result;
};

/**
 * Validate data consistency across rows
 */
const validateDataConsistency = (csvData, result) => {
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

  // Check for date format consistency
  const dateColumns = headers.filter(header => 
    header.toLowerCase().includes('date') || header.toLowerCase().includes('created_at')
  );

  dateColumns.forEach(column => {
    const formats = new Set();
    csvData.forEach(row => {
      const value = row[column];
      if (value) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          // Try to detect format pattern
          if (value.includes('/')) formats.add('MM/DD/YYYY');
          else if (value.includes('-') && value.length === 10) formats.add('YYYY-MM-DD');
          else if (value.includes('-') && value.length > 10) formats.add('YYYY-MM-DD HH:MM:SS');
          else formats.add('other');
        }
      }
    });

    if (formats.size > 1) {
      result.addWarning('consistency', 
        `Column "${column}" has mixed date formats: ${Array.from(formats).join(', ')}`
      );
    }
  });
};

/**
 * Generate user-friendly validation report
 */
export const generateValidationReport = (validationResult) => {
  const { isValid, errors, warnings, stats } = validationResult;
  
  let report = '';
  
  // Summary
  report += `## Validation Summary\n\n`;
  report += `- **Status**: ${isValid ? '✅ Valid' : '❌ Invalid'}\n`;
  report += `- **Total Rows**: ${stats.totalRows}\n`;
  report += `- **Valid Rows**: ${stats.validRows}\n`;
  report += `- **Invalid Rows**: ${stats.invalidRows}\n`;
  report += `- **Empty Rows**: ${stats.emptyRows}\n\n`;

  // Errors
  if (errors.length > 0) {
    report += `## Errors (${errors.length})\n\n`;
    errors.forEach((error, index) => {
      report += `${index + 1}. **${error.type}**: ${error.message}\n`;
    });
    report += '\n';
  }

  // Warnings
  if (warnings.length > 0) {
    report += `## Warnings (${warnings.length})\n\n`;
    warnings.forEach((warning, index) => {
      report += `${index + 1}. **${warning.type}**: ${warning.message}\n`;
    });
    report += '\n';
  }

  // Recommendations
  if (errors.length > 0 || warnings.length > 0) {
    report += `## Recommendations\n\n`;
    
    if (stats.invalidRows > 0) {
      report += `- Fix the ${stats.invalidRows} invalid rows to improve data quality\n`;
    }
    
    if (stats.emptyRows > 0) {
      report += `- Consider removing the ${stats.emptyRows} empty rows\n`;
    }
    
    if (errors.some(e => e.type === 'columns')) {
      report += `- Ensure all required columns are present in your CSV file\n`;
    }
    
    if (warnings.some(w => w.type === 'consistency')) {
      report += `- Standardize date formats for better consistency\n`;
    }
  }

  return report;
};

/**
 * Clean and transform CSV data based on validation results
 */
export const cleanCSVData = (csvData, validationResult = null) => {
  if (!csvData || csvData.length === 0) return [];

  // If no validation result provided, validate first
  const validation = validationResult || validateCSV(csvData);
  
  // Basic cleaning first
  const basicCleaned = csvData
    .filter((row, index) => {
      // Remove empty rows
      const isEmpty = Object.values(row).every(value => 
        !value || value.toString().trim() === ''
      );
      return !isEmpty;
    })
    .map(row => {
      const cleanedRow = {};
      
      Object.entries(row).forEach(([key, value]) => {
        // Clean column names
        const cleanKey = key.trim();
        
        // Clean values
        let cleanValue = value;
        if (typeof value === 'string') {
          cleanValue = value.trim();
          
          // Try to parse dates
          if (cleanKey.toLowerCase().includes('date') || cleanKey.toLowerCase().includes('created_at')) {
            const date = new Date(cleanValue);
            if (!isNaN(date.getTime())) {
              cleanValue = date.toISOString().split('T')[0]; // Standardize to YYYY-MM-DD
            }
          }
          
          // Try to parse numbers for amount fields
          if (cleanKey.toLowerCase().includes('total') || cleanKey.toLowerCase().includes('amount')) {
            const num = parseFloat(cleanValue);
            if (!isNaN(num)) {
              cleanValue = num;
            }
          }
        }
        
        cleanedRow[cleanKey] = cleanValue;
      });
      
      return cleanedRow;
    });

  return basicCleaned;
};