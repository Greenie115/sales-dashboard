// src/hooks/useBrandDetection.js
import { useMemo, useCallback } from 'react';

/**
 * Hook for detecting brands from product names and creating mappings
 * 
 * @param {Array} productNames - Array of product name strings
 * @returns {Object} Brand mapping utilities
 */
export const useBrandDetection = (productNames = []) => {
  /**
   * Identify brand prefixes and create brandMapping object
   */
  const brandMapping = useMemo(() => {
    if (!productNames || !Array.isArray(productNames) || productNames.length === 0) {
      return {};
    }
    
    try {
      // Filter out invalid product names
      const validProductNames = productNames.filter(name => 
        typeof name === 'string' && name.trim() !== ''
      );
      
      if (validProductNames.length === 0) {
        return {};
      }
      
      const result = {};
      
      // Pre-split names for efficiency
      const splitNames = validProductNames.map(name => name.split(' '));
      
      validProductNames.forEach((name, index) => {
        const words = splitNames[index];
        let brandWords = [];
        
        // Iterate through each word position to find common prefixes
        for (let i = 0; i < words.length; i++) {
          // Skip if the word is too short (likely not part of brand name)
          if (words[i].length < 2) continue;
          
          // Find products that share this prefix
          const candidates = splitNames.filter(otherWords => {
            if (otherWords.length <= i) return false;
            
            // Check if all previous words match
            for (let j = 0; j < i; j++) {
              if (otherWords[j] !== words[j]) return false;
            }
            
            return true;
          });
          
          // If more than one product shares the word at this position, it's likely part of the brand
          const allMatch = candidates.length > 1 && 
                          candidates.every(otherWords => otherWords[i] === words[i]);
          
          if (allMatch) {
            brandWords.push(words[i]);
          } else {
            break;
          }
        }
        
        // Create brand and display names
        const brandName = brandWords.join(' ');
        const displayName = brandWords.length > 0 
          ? words.slice(brandWords.length).join(' ') 
          : name;
        
        result[name] = {
          original: name,
          brandName: brandName,
          displayName: displayName
        };
      });
      
      return result;
    } catch (error) {
      console.error('Error in brand detection:', error);
      return {};
    }
  }, [productNames]);
  
  /**
   * Extract unique brand names from brandMapping
   */
  const brandNames = useMemo(() => {
    if (!brandMapping || Object.keys(brandMapping).length === 0) {
      return [];
    }
    
    try {
      // Get all brand names
      const brands = Object.values(brandMapping)
        .map(info => info.brandName)
        .filter(Boolean);
      
      // Remove duplicates and sort
      return [...new Set(brands)].sort();
    } catch (error) {
      console.error('Error extracting brand names:', error);
      return [];
    }
  }, [brandMapping]);
  
  /**
   * Get display name for a product
   * 
   * @param {string} product - Product name
   * @returns {string} Display name for the product
   */
  const getProductDisplayName = useCallback((product) => {
    if (!product) return '';
    
    // Use mapping if available
    if (brandMapping[product] && brandMapping[product].displayName) {
      return brandMapping[product].displayName;
    }
    
    // Fallback: try to extract display name based on common patterns
    const words = product.split(' ');
    if (words.length >= 3) {
      // For longer product names, try removing the first word(s)
      const wordsToRemove = words.length >= 5 ? 2 : 1;
      return words.slice(wordsToRemove).join(' ');
    }
    
    // Return original if no pattern applies
    return product;
  }, [brandMapping]);
  
  /**
   * Get brand name for a product
   * 
   * @param {string} product - Product name
   * @returns {string} Brand name for the product
   */
  const getProductBrandName = useCallback((product) => {
    if (!product) return '';
    
    // Use mapping if available
    if (brandMapping[product] && brandMapping[product].brandName) {
      return brandMapping[product].brandName;
    }
    
    // Fallback: try to extract brand name based on common patterns
    const words = product.split(' ');
    if (words.length >= 3) {
      // For longer product names, use the first word(s)
      const wordsToTake = words.length >= 5 ? 2 : 1;
      return words.slice(0, wordsToTake).join(' ');
    }
    
    // Return empty string if no pattern applies
    return '';
  }, [brandMapping]);
  
  /**
   * Group products by brand
   * 
   * @returns {Object} Products grouped by brand
   */
  const getProductsByBrand = useCallback(() => {
    if (!brandMapping || Object.keys(brandMapping).length === 0) {
      return {};
    }
    
    try {
      const result = {};
      
      // Group products by brand
      Object.entries(brandMapping).forEach(([product, info]) => {
        const brand = info.brandName || 'Other';
        
        if (!result[brand]) {
          result[brand] = [];
        }
        
        result[brand].push({
          name: product,
          displayName: info.displayName,
          brandName: brand
        });
      });
      
      return result;
    } catch (error) {
      console.error('Error grouping products by brand:', error);
      return {};
    }
  }, [brandMapping]);
  
  return {
    brandMapping,
    brandNames,
    getProductDisplayName,
    getProductBrandName,
    getProductsByBrand
  };
};