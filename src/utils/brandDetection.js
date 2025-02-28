export const identifyBrandPrefixes = (productNames) => {
  if (!productNames || productNames.length === 0) return {};

  const result = {};
  // Pre-split names for efficiency
  const splitNames = productNames.map(name => name.split(' '));

  productNames.forEach((name, index) => {
    const words = splitNames[index];
    let brandWords = [];

    // Iterate through each word position to build the common prefix
    for (let i = 0; i < words.length; i++) {
      // Filter for products that share the prefix up to word index i
      const candidates = splitNames.filter(otherWords => {
        if (otherWords.length <= i) return false;
        for (let j = 0; j < i; j++) {
          if (otherWords[j] !== words[j]) return false;
        }
        return true;
      });

      // If more than one product shares the word at this position, it's part of the brand
      const allMatch = candidates.length > 1 && candidates.every(otherWords => otherWords[i] === words[i]);

      if (allMatch) {
        brandWords.push(words[i]);
      } else {
        break;
      }
    }

    const brandName = brandWords.join(' ');
    // Calculate displayName by removing the brand words from the beginning
    const displayName = brandWords.length > 0 ? words.slice(brandWords.length).join(' ') : name;
    
    result[name] = {
      original: name,
      brandName,
      displayName
    };
  });

  return result;
};

export const extractBrandNames = (brandMapping) => {
  if (!brandMapping) return [];
  const brands = Object.values(brandMapping)
    .map(info => info.brandName)
    .filter(Boolean);
  return [...new Set(brands)];
};
