export const identifyBrandPrefixes = (productNames) => {
  if (!productNames || productNames.length <= 1) return {};

  // Build a trie where each node stores the number of products passing through it.
  const trie = {};

  // Insert each product (split by words) into the trie.
  productNames.forEach(name => {
    const words = name.split(' ');
    let node = trie;
    words.forEach(word => {
      if (!node[word]) {
        node[word] = { count: 0, children: {} };
      }
      node[word].count++;
      node = node[word].children;
    });
  });

  const result = {};

  // For each product, traverse the trie until a word is unique.
  productNames.forEach(name => {
    const words = name.split(' ');
    let node = trie;
    const brandWords = [];
    
    // Walk the trie until the current word is not common (i.e. count < 2)
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (node[word] && node[word].count >= 2) {
        brandWords.push(word);
        node = node[word].children;
      } else {
        break;
      }
    }

    const brandName = brandWords.join(' ');
    // Remove the brand prefix from the original name, if any.
    const displayName = brandName.length > 0 ? name.substring(brandName.length).trim() : name;
    
    result[name] = {
      original: name,
      brandName: brandName,
      displayName: displayName
    };
  });

  return result;
};

// Function to extract unique brand names from the mapping if needed
export const extractBrandNames = (brandMapping) => {
  if (!brandMapping) return [];
  
  const brands = Object.values(brandMapping)
    .map(info => info.brandName)
    .filter(Boolean);
    
  return [...new Set(brands)];
};
