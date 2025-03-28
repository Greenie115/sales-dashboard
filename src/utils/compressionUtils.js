/**
 * Utilities for compressing and decompressing data to reduce storage size
 */
import pako from 'pako'; // We'll need to install this package

/**
 * Compress data using gzip
 * @param {Object} data - The data to compress
 * @returns {string} - Base64 encoded compressed data
 */
export const compressData = (data) => {
  try {
    // Convert data to JSON string
    const jsonString = JSON.stringify(data);
    
    // Compress the string using pako (gzip)
    const compressed = pako.deflate(jsonString, { to: 'string' });
    
    // Convert to base64 for safe storage
    return btoa(compressed);
  } catch (error) {
    console.error('Error compressing data:', error);
    throw error;
  }
};

/**
 * Decompress data that was compressed with compressData
 * @param {string} compressedData - Base64 encoded compressed data
 * @returns {Object} - The decompressed data
 */
export const decompressData = (compressedData) => {
  try {
    // Convert from base64
    const compressed = atob(compressedData);
    
    // Decompress using pako
    const decompressed = pako.inflate(compressed, { to: 'string' });
    
    // Parse JSON
    return JSON.parse(decompressed);
  } catch (error) {
    console.error('Error decompressing data:', error);
    throw error;
  }
};

/**
 * Estimate compression ratio for a given dataset
 * @param {Object} data - The data to test
 * @returns {Object} - Compression statistics
 */
export const estimateCompressionRatio = (data) => {
  const jsonString = JSON.stringify(data);
  const originalSize = jsonString.length;
  
  const compressed = compressData(data);
  const compressedSize = compressed.length;
  
  const ratio = originalSize / compressedSize;
  
  return {
    originalSize,
    compressedSize,
    ratio,
    savings: (1 - (compressedSize / originalSize)) * 100
  };
};

/**
 * Split data into chunks for storage and transmission
 * @param {Object} data - The data to split
 * @param {number} maxChunkSize - Maximum size of each chunk in bytes
 * @returns {Array} - Array of chunks
 */
export const splitIntoChunks = (data, maxChunkSize = 100000) => {
  const compressed = compressData(data);
  const chunks = [];
  
  for (let i = 0; i < compressed.length; i += maxChunkSize) {
    chunks.push(compressed.slice(i, i + maxChunkSize));
  }
  
  return {
    chunks,
    totalChunks: chunks.length,
    originalSize: JSON.stringify(data).length,
    compressedSize: compressed.length
  };
};

/**
 * Reassemble chunks into original data
 * @param {Array} chunks - Array of chunks
 * @returns {Object} - The reassembled data
 */
export const reassembleChunks = (chunks) => {
  const compressed = chunks.join('');
  return decompressData(compressed);
};

export default {
  compressData,
  decompressData,
  estimateCompressionRatio,
  splitIntoChunks,
  reassembleChunks
};
