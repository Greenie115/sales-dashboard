// More aggressive brand identification function
export const identifyBrandPrefixes = (productNames) => {
    if (!productNames || productNames.length <= 1) return {};
  
    // Split all product names into word arrays
    const productWords = productNames.map(name => name.split(' '));
    
    // Find minimum product name length to avoid out-of-bounds errors
    const minLength = Math.min(...productWords.map(words => words.length));
    
    // Start with maximum possible prefix length (up to 4 words or minLength)
    const maxPrefixLength = Math.min(4, minLength - 1); // Allow up to 4 words for brand names
    
    // Track all brand mappings found for different prefix lengths
    const allMappings = {};
    let validMappingsFound = false;
    
    // Try different prefix lengths to identify brand patterns
    for (let prefixLength = maxPrefixLength; prefixLength > 0; prefixLength--) {
      // Group products by their potential prefix
      const prefixGroups = {};
      
      productWords.forEach(words => {
        const prefix = words.slice(0, prefixLength).join(' ');
        if (!prefixGroups[prefix]) prefixGroups[prefix] = 0;
        prefixGroups[prefix]++;
      });
      
      // Find prefixes that appear multiple times (likely brand names)
      // Lower threshold to 5% to catch more brand patterns
      const commonPrefixes = Object.entries(prefixGroups)
        .filter(([prefix, count]) => {
          // Consider a prefix common if it appears in at least 2 products
          // and represents at least 5% of all products (lowered from 10%)
          return count >= 2 && (count / productNames.length) >= 0.05;
        })
        .map(([prefix]) => prefix);
      
      if (commonPrefixes.length > 0) {
        validMappingsFound = true;
        
        // Process each product name with the identified common prefixes
        productNames.forEach(name => {
          // Find if this product starts with any of the common prefixes
          const matchedPrefix = commonPrefixes.find(prefix => 
            name.startsWith(prefix + ' ')
          );
          
          if (matchedPrefix) {
            // Remove the prefix and trim any extra spaces
            const unbranded = name.substring(matchedPrefix.length).trim();
            
            // Store the mapping - only override if we don't already have one
            // or if we found a longer prefix (more specific brand)
            if (!allMappings[name] || matchedPrefix.length > allMappings[name].brandName.length) {
              allMappings[name] = {
                original: name,
                brandName: matchedPrefix,
                displayName: unbranded
              };
            }
          } else if (!allMappings[name]) {
            // No common prefix found and no mapping exists yet
            allMappings[name] = {
              original: name,
              brandName: '',
              displayName: name
            };
          }
        });
      }
    }
  
  // If still no valid mappings, try a more aggressive approach by looking at common first words
  if (!validMappingsFound) {
    // Count frequency of first words
    const firstWordCounts = {};
    productWords.forEach(words => {
      if (words.length > 0) {
        const firstWord = words[0];
        firstWordCounts[firstWord] = (firstWordCounts[firstWord] || 0) + 1;
      }
    });
    
    // Find common first words
    const commonFirstWords = Object.entries(firstWordCounts)
      .filter(([word, count]) => count >= 2)
      .map(([word]) => word);
    
    if (commonFirstWords.length > 0) {
      productNames.forEach(name => {
        const words = name.split(' ');
        if (words.length > 1 && commonFirstWords.includes(words[0])) {
          allMappings[name] = {
            original: name,
            brandName: words[0],
            displayName: words.slice(1).join(' ')
          };
        } else {
          allMappings[name] = {
            original: name,
            brandName: '',
            displayName: name
          };
        }
      });
      validMappingsFound = true;
    }
  }
  
  // If no valid mappings found, try the simplest approach - just remove the first word
  // from any product with 3+ words
  if (!validMappingsFound) {
    productNames.forEach(name => {
      const words = name.split(' ');
      if (words.length >= 3) {
        allMappings[name] = {
          original: name,
          brandName: words[0],
          displayName: words.slice(1).join(' ')
        };
      } else {
        allMappings[name] = {
          original: name,
          brandName: '',
          displayName: name
        };
      }
    });
  }
  
  return allMappings;
};

// Function to extract brand names from the mapping for possible use
export const extractBrandNames = (brandMapping) => {
  if (!brandMapping) return [];
  
  // Get unique brand names that are not empty
  const brands = Object.values(brandMapping)
    .map(info => info.brandName)
    .filter(Boolean);
    
  return [...new Set(brands)]; // Return unique brand names
};