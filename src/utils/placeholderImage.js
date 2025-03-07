// src/utils/placeholderImage.js
/**
 * Generate a data URI for a colored placeholder image
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {string} bgColor - Background color (hex without #)
 * @param {string} textColor - Text color (hex without #)
 * @param {string} text - Optional text to display
 * @returns {string} - Data URI for the image
 */
export const generatePlaceholder = (width = 150, height = 150, bgColor = 'FF0066', textColor = 'FFFFFF', text = 'SD') => {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  // Get the drawing context
  const ctx = canvas.getContext('2d');
  
  // Draw background
  ctx.fillStyle = `#${bgColor}`;
  ctx.fillRect(0, 0, width, height);
  
  // Draw text
  if (text) {
    ctx.fillStyle = `#${textColor}`;
    ctx.font = `bold ${Math.floor(width/4)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width/2, height/2);
  }
  
  // Convert to data URI
  return canvas.toDataURL('image/png');
};

/**
 * Get a placeholder image for use in img src
 */
export const getPlaceholderSrc = (width = 150, height = 150, bgColor = 'FF0066', textColor = 'FFFFFF', text = 'SD') => {
  return generatePlaceholder(width, height, bgColor, textColor, text);
};

export default getPlaceholderSrc;