const unicodeSafeBase64Decode = (base64url) => {
    try {
      if (!base64url) {
        throw new Error("No data provided to decode");
      }
      
      // Fix Base64 URL-safe characters back to standard Base64
      let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      
      // Add padding if needed
      while (base64.length % 4 !== 0) {
        base64 += '=';
      }
      
      // Decode using a binary string approach
      const binary = window.atob(base64);
      
      // Convert to Uint8Array
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      // Decode the UTF-8 bytes to string
      return new TextDecoder().decode(bytes);
    } catch (error) {
      console.error("Error in unicodeSafeBase64Decode:", error);
      throw new Error(`Failed to decode Base64 data: ${error.message}`);
    }
  };
  // Fixed version of decodeBase64InChunks
  /**
 * Improved chunked Base64 decoder for large strings
 * 
 * @param {string} base64url - The Base64 URL-safe encoded string to decode
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<string>} - The decoded string
 */
const decodeBase64InChunks = async (base64url, progressCallback = () => {}) => {
  try {
    if (!base64url) {
      throw new Error("No data provided to decode");
    }
    
    progressCallback(10, "Starting decode");
    
    // First attempt: try direct decode with unicode safety
    try {
      progressCallback(30, "Trying direct decode");
      const decodedString = unicodeSafeBase64Decode(base64url);
      progressCallback(70, "Parsing JSON");
      const parsedData = JSON.parse(decodedString);
      progressCallback(100, "Complete");
      return parsedData;
    } catch (directError) {
      console.warn("Direct decode failed, trying chunked approach:", directError);
      progressCallback(40, "Direct decode failed, trying chunked approach");
    }
    
    // For large strings, use the chunked approach
    // Convert Base64 URL-safe to standard Base64
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    
    const CHUNK_SIZE = 500000; // 500KB chunks
    const chunks = [];
    
    // Split into manageable chunks
    for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
      chunks.push(base64.slice(i, i + CHUNK_SIZE));
    }
    
    let result = '';
    let processedChunks = 0;
    
    // Process each chunk
    for (const chunk of chunks) {
      try {
        const binary = window.atob(chunk);
        const bytes = new Uint8Array(binary.length);
        for (let j = 0; j < binary.length; j++) {
          bytes[j] = binary.charCodeAt(j);
        }
        
        result += new TextDecoder().decode(bytes);
        
        processedChunks++;
        progressCallback(40 + Math.floor((processedChunks / chunks.length) * 50), 
          `Processed ${processedChunks} of ${chunks.length} chunks`);
      } catch (chunkError) {
        console.error(`Error processing chunk ${processedChunks + 1}:`, chunkError);
        throw new Error(`Chunk ${processedChunks + 1} decode failed: ${chunkError.message}`);
      }
    }
    
    progressCallback(90, "Parsing JSON");
    
    // Parse the JSON
    try {
      const parsedData = JSON.parse(result);
      progressCallback(100, "Complete");
      return parsedData;
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      throw new Error(`JSON parsing failed: ${parseError.message}`);
    }
  } catch (error) {
    console.error("Error in decodeBase64InChunks:", error);
    progressCallback(100, `Error: ${error.message}`);
    throw error;
  }
};

export { unicodeSafeBase64Decode, decodeBase64InChunks };