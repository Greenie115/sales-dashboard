/**
 * Utility for extracting and processing survey response data from sales data.
 * This is a generic implementation that doesn't hardcode any specific responses.
 */

/**
 * Process survey response data from sales data for consistent sharing between dashboards.
 * 
 * @param {Array} salesData - The complete sales data array
 * @param {Object} filters - Optional filters to apply to the data
 * @param {Function} getFilteredData - Function to filter data (if not passing pre-filtered data)
 * @returns {Object} Processed survey response data organized by question/proposition
 */
export const getSurveyResponseData = (salesData, filters = null, getFilteredData = null) => {
    if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
      return {
        questions: {},
        meta: {
          totalResponses: 0,
          questionCount: 0
        }
      };
    }
    
    try {
      // Apply filters if provided and getFilteredData function is available
      let dataToProcess = salesData;
      if (filters && typeof getFilteredData === 'function') {
        dataToProcess = getFilteredData(filters);
      }
      
      // Initialize result structure
      const result = {
        questions: {},
        meta: {
          totalResponses: 0,
          questionCount: 0
        }
      };
      
      // Get all question and proposition columns
      const sampleRow = dataToProcess[0] || {};
      const questionColumns = Object.keys(sampleRow).filter(key => key.startsWith('question_'));
      const propositionColumns = Object.keys(sampleRow).filter(key => key.startsWith('proposition_'));
      
      // Process each proposition column
      propositionColumns.forEach(propCol => {
        // Get the matching question column
        const questionNumber = propCol.replace('proposition_', '');
        const questionCol = `question_${questionNumber}`;
        
        // Get responses from this column
        const responses = dataToProcess
          .filter(row => row[propCol] && typeof row[propCol] === 'string' && row[propCol].trim() !== '')
          .map(row => ({
            response: row[propCol],
            questionText: row[questionCol] || `Question ${questionNumber}`,
            demographics: {
              gender: row.gender,
              ageGroup: row.age_group
            },
            rowData: row // Include full row data for additional filtering/analysis
          }));
        
        // If we have responses, process them
        if (responses.length > 0) {
          // Get question text from first response (should be consistent)
          const questionText = responses[0].questionText;
          
          // Count response frequencies
          const counts = {};
          responses.forEach(item => {
            const response = item.response;
            counts[response] = (counts[response] || 0) + 1;
          });
          
          // Calculate percentages
          const percentages = {};
          const totalForQuestion = responses.length;
          Object.keys(counts).forEach(response => {
            percentages[response] = (counts[response] / totalForQuestion) * 100;
          });
          
          // Demographic breakdowns
          const genderBreakdown = {};
          const ageBreakdown = {};
          
          // Process gender breakdowns
          const genderGroups = {};
          responses.forEach(item => {
            if (item.demographics.gender) {
              const gender = item.demographics.gender;
              if (!genderGroups[gender]) genderGroups[gender] = [];
              genderGroups[gender].push(item);
            }
          });
          
          Object.entries(genderGroups).forEach(([gender, items]) => {
            genderBreakdown[gender] = {
              count: items.length,
              percentage: (items.length / totalForQuestion) * 100,
              responseBreakdown: {}
            };
            
            // Count responses within this gender group
            items.forEach(item => {
              const response = item.response;
              genderBreakdown[gender].responseBreakdown[response] = 
                (genderBreakdown[gender].responseBreakdown[response] || 0) + 1;
            });
          });
          
          // Process age breakdowns
          const ageGroups = {};
          responses.forEach(item => {
            if (item.demographics.ageGroup) {
              const ageGroup = item.demographics.ageGroup;
              if (!ageGroups[ageGroup]) ageGroups[ageGroup] = [];
              ageGroups[ageGroup].push(item);
            }
          });
          
          Object.entries(ageGroups).forEach(([ageGroup, items]) => {
            ageBreakdown[ageGroup] = {
              count: items.length,
              percentage: (items.length / totalForQuestion) * 100,
              responseBreakdown: {}
            };
            
            // Count responses within this age group
            items.forEach(item => {
              const response = item.response;
              ageBreakdown[ageGroup].responseBreakdown[response] = 
                (ageBreakdown[ageGroup].responseBreakdown[response] || 0) + 1;
            });
          });
          
          // Add to result structure
          result.questions[questionNumber] = {
            questionText,
            propColumn: propCol,
            questionColumn: questionCol,
            responses: responses.map(r => r.response),
            uniqueResponses: Object.keys(counts),
            counts,
            percentages,
            totalResponses: totalForQuestion,
            demographics: {
              gender: genderBreakdown,
              age: ageBreakdown
            }
          };
          
          // Update meta information
          result.meta.totalResponses += totalForQuestion;
          result.meta.questionCount++;
        }
      });
      
      return result;
    } catch (error) {
      console.error("Error in getSurveyResponseData:", error);
      return {
        questions: {},
        meta: {
          totalResponses: 0,
          questionCount: 0,
          error: error.message
        }
      };
    }
  };
  
  export default getSurveyResponseData;