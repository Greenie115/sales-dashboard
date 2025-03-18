/**
 * Utilities for processing and analyzing demographic data
 */
import _ from 'lodash';

/**
 * Extract and process demographic data from sales data
 * 
 * @param {Array} salesData - The sales data array
 * @returns {Object} Processed demographic data
 */
export const extractDemographicData = (salesData) => {
  if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
    return {
      genderDistribution: [],
      ageDistribution: [],
      availableQuestions: [],
      questionTexts: {}
    };
  }
  
  try {
    // Extract gender distribution if gender field exists
    const genderGroups = _.groupBy(
      salesData.filter(item => item.gender),
      'gender'
    );
    
    const genderDistribution = Object.keys(genderGroups).length > 0 
      ? Object.entries(genderGroups)
          .map(([gender, items]) => ({
            name: gender,
            value: items.length,
            percentage: (items.length / salesData.length) * 100
          }))
          .sort((a, b) => b.value - a.value)
      : [];
    
    // Extract age distribution if age_group field exists
    const ageGroups = _.groupBy(
      salesData.filter(item => item.age_group),
      'age_group'
    );
    
    const ageDistribution = Object.keys(ageGroups).length > 0
      ? Object.entries(ageGroups)
          .map(([ageGroup, items]) => ({
            ageGroup,
            count: items.length,
            percentage: (items.length / salesData.length) * 100
          }))
          .sort((a, b) => b.count - a.count)
      : [];
    
    // Check for question fields
    const questionFields = [];
    const sampleRow = salesData[0];
    
    if (sampleRow) {
      for (let i = 1; i <= 10; i++) {
        const paddedNum = i.toString().padStart(2, '0');
        const questionKey = `question_${paddedNum}`;
        const propKey = `proposition_${paddedNum}`;
        
        if (sampleRow[questionKey] !== undefined || sampleRow[propKey] !== undefined) {
          questionFields.push({
            number: paddedNum,
            questionKey,
            propKey
          });
        }
      }
    }
    
    // Process survey questions to get available questions and question texts
    const availableQuestions = questionFields.map(q => q.number);
    const questionTexts = {};
    
    questionFields.forEach(field => {
      const questionEntry = salesData.find(
        row => row[field.questionKey] && row[field.questionKey].trim() !== ''
      );
      
      if (questionEntry) {
        questionTexts[field.number] = questionEntry[field.questionKey];
      } else {
        questionTexts[field.number] = `Question ${parseInt(field.number)}`;
      }
    });
    
    return {
      genderDistribution,
      ageDistribution,
      availableQuestions,
      questionTexts,
      questionFields
    };
  } catch (error) {
    console.error("Error extracting demographic data:", error);
    return {
      genderDistribution: [],
      ageDistribution: [],
      availableQuestions: [],
      questionTexts: {}
    };
  }
};

/**
 * Analyze responses for a specific question number
 * 
 * @param {Array} salesData - The sales data array
 * @param {string} questionNumber - The question number to analyze
 * @returns {Object} Response analysis
 */
export const analyzeQuestionResponses = (salesData, questionNumber) => {
  if (!salesData || !Array.isArray(salesData) || salesData.length === 0 || !questionNumber) {
    return {
      responses: [],
      uniqueResponses: [],
      counts: {},
      percentages: {},
      totalResponses: 0
    };
  }
  
  try {
    const propKey = `proposition_${questionNumber}`;
    const questionKey = `question_${questionNumber}`;
    
    // Filter responses that have non-empty propositions
    const responses = salesData
      .filter(row => row[propKey] && typeof row[propKey] === 'string' && row[propKey].trim() !== '')
      .map(row => ({
        response: row[propKey],
        gender: row.gender,
        ageGroup: row.age_group
      }));
    
    if (responses.length === 0) {
      return {
        responses: [],
        uniqueResponses: [],
        counts: {},
        percentages: {},
        totalResponses: 0
      };
    }
    
    // Get unique responses
    const uniqueResponses = [...new Set(responses.map(r => r.response))];
    
    // Count occurrences of each response
    const counts = {};
    responses.forEach(item => {
      const response = item.response;
      counts[response] = (counts[response] || 0) + 1;
    });
    
    // Calculate percentages
    const totalResponses = responses.length;
    const percentages = {};
    Object.keys(counts).forEach(response => {
      percentages[response] = (counts[response] / totalResponses) * 100;
    });
    
    return {
      responses: responses.map(r => r.response),
      uniqueResponses,
      counts,
      percentages,
      totalResponses
    };
  } catch (error) {
    console.error("Error analyzing question responses:", error);
    return {
      responses: [],
      uniqueResponses: [],
      counts: {},
      percentages: {},
      totalResponses: 0
    };
  }
};

/**
 * Generate age and gender breakdown for selected responses
 * 
 * @param {Array} salesData - The sales data array
 * @param {string} questionNumber - The question number to analyze
 * @param {Array} selectedResponses - Array of selected response values
 * @returns {Object} Demographic breakdown for selected responses
 */
export const generateResponseDemographics = (salesData, questionNumber, selectedResponses) => {
  if (!salesData || !Array.isArray(salesData) || salesData.length === 0 || 
      !questionNumber || !selectedResponses || !Array.isArray(selectedResponses) || 
      selectedResponses.length === 0) {
    return {
      genderDistribution: [],
      ageDistribution: []
    };
  }
  
  try {
    const propKey = `proposition_${questionNumber}`;
    
    // Filter data to rows that have one of the selected responses
    const matchingRows = salesData.filter(row => 
      row[propKey] && 
      selectedResponses.includes(row[propKey])
    );
    
    if (matchingRows.length === 0) {
      return {
        genderDistribution: [],
        ageDistribution: []
      };
    }
    
    // Get gender distribution
    const genderGroups = _.groupBy(
      matchingRows.filter(row => row.gender),
      'gender'
    );
    
    const genderDistribution = Object.keys(genderGroups).length > 0
      ? Object.entries(genderGroups)
          .map(([gender, items]) => ({
            name: gender,
            value: items.length,
            percentage: (items.length / matchingRows.length) * 100
          }))
          .sort((a, b) => b.value - a.value)
      : [];
    
    // Get age distribution
    const ageGroups = _.groupBy(
      matchingRows.filter(row => row.age_group),
      'age_group'
    );
    
    const ageDistribution = Object.keys(ageGroups).length > 0
      ? Object.entries(ageGroups)
          .map(([ageGroup, items]) => ({
            ageGroup,
            count: items.length,
            percentage: (items.length / matchingRows.length) * 100
          }))
          .sort((a, b) => b.count - a.count)
      : [];
    
    return {
      genderDistribution,
      ageDistribution
    };
  } catch (error) {
    console.error("Error generating response demographics:", error);
    return {
      genderDistribution: [],
      ageDistribution: []
    };
  }
};

// Define the preferred sorting order for age groups
export const AGE_GROUP_ORDER = [
  '16-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
  'Under 18'
];

/**
 * Sort age groups according to predefined order
 * 
 * @param {Array} ageData - Array of age group data objects
 * @param {string} keyName - The key containing the age group name (default: 'ageGroup')
 * @returns {Array} Sorted age data
 */
export const sortAgeGroups = (ageData, keyName = 'ageGroup') => {
  if (!ageData || !Array.isArray(ageData)) return [];
  
  return [...ageData].sort((a, b) => {
    const aGroup = a[keyName];
    const bGroup = b[keyName];
    
    const aIndex = AGE_GROUP_ORDER.indexOf(aGroup);
    const bIndex = AGE_GROUP_ORDER.indexOf(bGroup);
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    return aGroup.localeCompare(bGroup);
  });
};

export default {
  extractDemographicData,
  analyzeQuestionResponses,
  generateResponseDemographics,
  sortAgeGroups,
  AGE_GROUP_ORDER
};