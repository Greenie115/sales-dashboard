// src/utils/dataTransformation.js
/**
 * Data transformation pipeline for handling different CSV formats
 * This module provides flexible transformation rules to convert various
 * CSV formats into the standard format expected by the dashboard
 */

import { safeParseDate, safeToISOString } from './dateUtils';

/**
 * Common column name mappings for different CSV formats
 */
export const COLUMN_MAPPINGS = {
  // Sales data mappings
  sales: {
    // Date field variations
    'date': 'receipt_date',
    'transaction_date': 'receipt_date',
    'purchase_date': 'receipt_date',
    'order_date': 'receipt_date',
    'created_at': 'receipt_date',
    'timestamp': 'receipt_date',
    
    // Product field variations
    'product': 'product_name',
    'item': 'product_name',
    'item_name': 'product_name',
    'product_title': 'product_name',
    'description': 'product_name',
    'sku': 'product_name',
    
    // Retailer/chain field variations
    'retailer': 'chain',
    'store': 'chain',
    'merchant': 'chain',
    'vendor': 'chain',
    'shop': 'chain',
    'outlet': 'chain',
    
    // Amount field variations
    'amount': 'receipt_amount',
    'total': 'receipt_amount',
    'price': 'receipt_amount',
    'value': 'receipt_amount',
    'cost': 'receipt_amount',
    'spend': 'receipt_amount',
    
    // User field variations
    'customer_id': 'user_id',
    'customer': 'user_id',
    'user': 'user_id',
    'userid': 'user_id'
  },
  
  // Offer data mappings
  offers: {
    // ID field variations
    'id': 'hit_id',
    'offer_hit_id': 'hit_id',
    'engagement_id': 'hit_id',
    'interaction_id': 'hit_id',
    
    // Timestamp variations
    'timestamp': 'created_at',
    'date': 'created_at',
    'hit_date': 'created_at',
    'engagement_date': 'created_at',
    
    // Offer name variations
    'offer': 'offer_name',
    'campaign': 'offer_name',
    'promotion': 'offer_name',
    'deal': 'offer_name',
    
    // User field variations
    'customer_id': 'user_id',
    'customer': 'user_id',
    'user': 'user_id',
    'userid': 'user_id'
  },
  
  // Demographics mappings
  demographics: {
    // User field variations
    'id': 'user_id',
    'customer_id': 'user_id',
    'customer': 'user_id',
    'user': 'user_id',
    'userid': 'user_id',
    
    // Age field variations
    'age': 'age_group',
    'age_range': 'age_group',
    'age_bracket': 'age_group',
    
    // Gender field variations
    'sex': 'gender',
    
    // Location field variations
    'city': 'location',
    'region': 'location',
    'state': 'location',
    'country': 'location'
  }
};

/**
 * Helper functions to check if transformation is needed
 */
const TRANSFORMATION_CHECKS = {
  // Check if a date is already in ISO format
  isISODate: (value) => {
    if (!value || typeof value !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(value.trim());
  },
  
  // Check if a value is already a clean number
  isCleanNumber: (value) => {
    if (value === null || value === undefined || value === '') return false;
    const num = parseFloat(value);
    return !isNaN(num) && value.toString() === num.toString();
  },
  
  // Check if text is already clean (no leading/trailing spaces, not empty)
  isCleanText: (value) => {
    if (!value || typeof value !== 'string') return false;
    return value === value.trim() && value.length > 0;
  },
  
  // Check if a column already has the standard name
  hasStandardColumnName: (columnName, targetName) => {
    return columnName.toLowerCase().trim() === targetName.toLowerCase();
  }
};

/**
 * Value transformation functions
 */
export const VALUE_TRANSFORMERS = {
  // Date format standardization using robust date utils
  standardizeDate: (value) => {
    if (!value) return value;
    
    // Skip transformation if already in ISO format
    if (TRANSFORMATION_CHECKS.isISODate(value)) {
      return value;
    }
    
    const parsedDate = safeParseDate(value);
    if (parsedDate) {
      const isoString = safeToISOString(parsedDate);
      return isoString || value;
    }
    
    return value; // Return original if can't parse
  },
  
  // Numeric value cleaning
  cleanNumeric: (value) => {
    if (!value) return null;
    
    // Skip transformation if already a clean number
    if (TRANSFORMATION_CHECKS.isCleanNumber(value)) {
      return value;
    }
    
    // Remove currency symbols and commas
    const cleaned = value.toString()
      .replace(/[$£€¥₹,]/g, '')
      .replace(/[^\d.-]/g, '')
      .trim();
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  },
  
  // Text cleaning
  cleanText: (value) => {
    if (!value) return value;
    
    // Skip transformation if already clean text
    if (TRANSFORMATION_CHECKS.isCleanText(value)) {
      return value;
    }
    
    return value.toString()
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/^"|"$/g, ''); // Remove surrounding quotes
  },
  
  // Age group standardization
  standardizeAgeGroup: (value) => {
    if (!value) return value;
    
    const ageStr = value.toString().toLowerCase();
    
    // Map various age formats to standard groups
    const ageMap = {
      'under 18': 'Under 18',
      '16-24': '16-24',
      '25-34': '25-34',
      '35-44': '35-44',
      '45-54': '45-54',
      '55-64': '55-64',
      '65+': '65+',
      'over 65': '65+'
    };
    
    // Try exact match first
    for (const [key, standardValue] of Object.entries(ageMap)) {
      if (ageStr.includes(key)) {
        return standardValue;
      }
    }
    
    // Try to parse numeric age and convert to group
    const numMatch = ageStr.match(/(\d+)/);
    if (numMatch) {
      const age = parseInt(numMatch[1]);
      if (age < 18) return 'Under 18';
      if (age <= 24) return '16-24';
      if (age <= 34) return '25-34';
      if (age <= 44) return '35-44';
      if (age <= 54) return '45-54';
      if (age <= 64) return '55-64';
      return '65+';
    }
    
    return value;
  },
  
  // Gender standardization
  standardizeGender: (value) => {
    if (!value) return value;
    
    const genderStr = value.toString().toLowerCase();
    
    if (genderStr.includes('m') || genderStr === 'male') return 'Male';
    if (genderStr.includes('f') || genderStr === 'female') return 'Female';
    if (genderStr.includes('other') || genderStr.includes('non-binary')) return 'Other';
    
    return value;
  }
};

/**
 * Transformation rules for different data types
 */
export const TRANSFORMATION_RULES = {
  sales: {
    columnMappings: COLUMN_MAPPINGS.sales,
    transformations: {
      'receipt_date': VALUE_TRANSFORMERS.standardizeDate,
      'receipt_amount': VALUE_TRANSFORMERS.cleanNumeric,
      'product_name': VALUE_TRANSFORMERS.cleanText,
      'chain': VALUE_TRANSFORMERS.cleanText
    },
    required: ['receipt_date', 'product_name', 'chain']
  },
  
  offers: {
    columnMappings: COLUMN_MAPPINGS.offers,
    transformations: {
      'created_at': VALUE_TRANSFORMERS.standardizeDate,
      'hit_id': VALUE_TRANSFORMERS.cleanText,
      'offer_name': VALUE_TRANSFORMERS.cleanText,
      'age_group': VALUE_TRANSFORMERS.standardizeAgeGroup,
      'gender': VALUE_TRANSFORMERS.standardizeGender
    },
    required: ['hit_id', 'created_at']
  },
  
  demographics: {
    columnMappings: COLUMN_MAPPINGS.demographics,
    transformations: {
      'age_group': VALUE_TRANSFORMERS.standardizeAgeGroup,
      'gender': VALUE_TRANSFORMERS.standardizeGender,
      'user_id': VALUE_TRANSFORMERS.cleanText,
      'location': VALUE_TRANSFORMERS.cleanText
    },
    required: ['user_id']
  }
};

/**
 * Transform CSV data using the appropriate transformation rules
 */
export const transformData = (data, dataType = 'sales') => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { transformedData: [], report: { issues: ['No data to transform'] } };
  }
  
  const rules = TRANSFORMATION_RULES[dataType];
  if (!rules) {
    return { 
      transformedData: data, 
      report: { issues: [`Unknown data type: ${dataType}`] } 
    };
  }
  
  const report = {
    originalColumns: Object.keys(data[0]),
    mappedColumns: {},
    transformedFields: [],
    issues: [],
    warnings: [],
    stats: {
      totalRows: data.length,
      successfulRows: 0,
      transformedValues: 0,
      skippedTransformations: 0
    }
  };
  
  // Step 1: Smart column mapping (only map if actually needed)
  const mappedData = data.map(row => {
    const mappedRow = {};
    
    Object.entries(row).forEach(([originalColumn, value]) => {
      const cleanColumn = originalColumn.toLowerCase().trim();
      const targetColumn = rules.columnMappings[cleanColumn];
      
      // Only apply mapping if the column name actually needs to be changed
      if (targetColumn && !TRANSFORMATION_CHECKS.hasStandardColumnName(originalColumn, targetColumn)) {
        mappedRow[targetColumn] = value;
        report.mappedColumns[originalColumn] = targetColumn;
      } else {
        // Use original column name if no mapping needed or already standard
        mappedRow[originalColumn] = value;
      }
    });
    
    return mappedRow;
  });
  
  // Step 2: Apply value transformations
  const transformedData = mappedData.map((row, index) => {
    const transformedRow = { ...row };
    let rowHasErrors = false;
    
    Object.entries(rules.transformations).forEach(([column, transformer]) => {
      if (transformedRow[column] !== undefined) {
        try {
          const originalValue = transformedRow[column];
          const transformedValue = transformer(originalValue);
          
          if (transformedValue !== originalValue) {
            transformedRow[column] = transformedValue;
            report.stats.transformedValues++;
            
            if (!report.transformedFields.includes(column)) {
              report.transformedFields.push(column);
            }
          } else {
            // Track skipped transformations (data was already in correct format)
            report.stats.skippedTransformations++;
          }
        } catch (error) {
          // Distinguish between critical errors and minor issues
          const errorMessage = `Row ${index + 1}: Error transforming ${column}: ${error.message}`;
          
          // If transformation fails but we have the original value, treat as warning
          if (transformedRow[column] !== null && transformedRow[column] !== undefined) {
            report.warnings.push(errorMessage);
          } else {
            // Critical error - missing required data
            report.issues.push(errorMessage);
            rowHasErrors = true;
          }
        }
      }
    });
    
    // Step 3: Validate required fields
    const missingRequired = rules.required.filter(field => 
      !transformedRow[field] || transformedRow[field].toString().trim() === ''
    );
    
    if (missingRequired.length > 0) {
      report.issues.push(
        `Row ${index + 1}: Missing required fields: ${missingRequired.join(', ')}`
      );
      rowHasErrors = true;
    }
    
    if (!rowHasErrors) {
      report.stats.successfulRows++;
    }
    
    return transformedRow;
  });
  
  return { transformedData, report };
};

/**
 * Suggest column mappings based on data analysis
 */
export const suggestColumnMappings = (headers, dataType = 'sales') => {
  const suggestions = {};
  const rules = TRANSFORMATION_RULES[dataType];
  
  if (!rules) return suggestions;
  
  headers.forEach(header => {
    const cleanHeader = header.toLowerCase().trim();
    const mappedColumn = rules.columnMappings[cleanHeader];
    
    if (mappedColumn) {
      suggestions[header] = {
        suggested: mappedColumn,
        confidence: 'high',
        reason: 'Exact column name match'
      };
    } else {
      // Try fuzzy matching
      Object.entries(rules.columnMappings).forEach(([pattern, target]) => {
        if (cleanHeader.includes(pattern) || pattern.includes(cleanHeader)) {
          if (!suggestions[header] || suggestions[header].confidence !== 'high') {
            suggestions[header] = {
              suggested: target,
              confidence: 'medium',
              reason: `Partial match with "${pattern}"`
            };
          }
        }
      });
    }
  });
  
  return suggestions;
};

/**
 * Generate transformation report
 */
export const generateTransformationReport = (report) => {
  let reportText = '## Data Transformation Report\n\n';
  
  // Statistics
  reportText += '### Statistics\n';
  reportText += `- **Total Rows**: ${report.stats.totalRows}\n`;
  reportText += `- **Successfully Processed**: ${report.stats.successfulRows}\n`;
  reportText += `- **Values Transformed**: ${report.stats.transformedValues}\n\n`;
  
  // Column mappings
  if (Object.keys(report.mappedColumns).length > 0) {
    reportText += '### Column Mappings\n';
    Object.entries(report.mappedColumns).forEach(([original, mapped]) => {
      reportText += `- \`${original}\` → \`${mapped}\`\n`;
    });
    reportText += '\n';
  }
  
  // Transformed fields
  if (report.transformedFields.length > 0) {
    reportText += '### Transformed Fields\n';
    report.transformedFields.forEach(field => {
      reportText += `- \`${field}\`: Values cleaned and standardized\n`;
    });
    reportText += '\n';
  }
  
  // Issues
  if (report.issues.length > 0) {
    reportText += '### Issues Found\n';
    report.issues.forEach((issue, index) => {
      reportText += `${index + 1}. ${issue}\n`;
    });
    reportText += '\n';
  } else {
    reportText += '### ✅ No Issues Found\n';
    reportText += 'All data was transformed successfully!\n\n';
  }
  
  return reportText;
};

/**
 * Auto-detect and transform data
 */
export const autoTransformData = (data, dataType = null) => {
  if (!data || data.length === 0) {
    return { 
      transformedData: [], 
      report: { issues: ['No data provided'] },
      detectedType: null 
    };
  }
  
  // Auto-detect data type if not provided
  let detectedType = dataType;
  if (!detectedType) {
    const headers = Object.keys(data[0]).map(h => h.toLowerCase());
    
    if (headers.some(h => h.includes('receipt') || h.includes('transaction'))) {
      detectedType = 'sales';
    } else if (headers.some(h => h.includes('hit') || h.includes('offer'))) {
      detectedType = 'offers';
    } else if (headers.some(h => h.includes('age') || h.includes('gender'))) {
      detectedType = 'demographics';
    } else {
      detectedType = 'sales'; // Default fallback
    }
  }
  
  const result = transformData(data, detectedType);
  return {
    ...result,
    detectedType
  };
};