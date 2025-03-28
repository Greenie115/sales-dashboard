// ShareButton.js
import React from 'react';
import { useSharing } from '../../context/SharingContext';
import { useData } from '../../context/DataContext'; // Add this import

// Share icon as inline SVG
const ShareIcon = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={1.5}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" 
    />
  </svg>
);

const ShareButton = ({ className = "", variant = "primary", size = "md", icon = true, label = "Share" }) => {
  // Access the sharing context
  const sharingContext = useSharing();
  
  // Access data context for upload status
  const { loading, currentDatasetStorageId, error: dataError } = useData(); // Also get error state
  
  // Determine if the button should be functionally disabled (prevent generating link)
  // It's disabled if not loading AND (no ID yet OR there was an error during upload)
  const isShareDisabled = !loading && (!currentDatasetStorageId || !!dataError);
  
  // Determine appropriate button text
  const buttonText = loading ? "Uploading..." :
                    (!currentDatasetStorageId || !!dataError) ? "Upload data first" : // Show this if disabled after loading
                    label; // Show normal label if enabled
  
  // Debug - log what's in the context
  console.log("SharingContext in button:", sharingContext);
  console.log("Data upload status:", { loading, currentDatasetStorageId });
  
  // Explicit function for onClick to avoid direct reference issues
  const handleShareClick = () => {
    if (isShareDisabled) {
      // Optionally show a message explaining why sharing is disabled
      console.log("Cannot share: " + (loading ? "Data is still uploading" : "No data has been uploaded"));
      // If it's disabled, we don't open the modal.
      // If it's loading, isShareDisabled is false, so we proceed to open the modal.
      return; 
    }
    
    // Allow opening the modal even if loading is true
    if (sharingContext && typeof sharingContext.openSharingModal === 'function') {
      sharingContext.openSharingModal();
    } else {
      console.error("openSharingModal is not a function or SharingContext is not properly initialized");
    }
  };
  
  // Define styles based on variant and size
  const getButtonClasses = () => {
    // Base classes
    let classes = "inline-flex items-center justify-center rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ";
    
    // Add variant-specific classes
    if (variant === 'primary') {
      classes += "bg-pink-600 text-white hover:bg-pink-700 focus:ring-pink-500 ";
    } else if (variant === 'secondary') {
      classes += "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-pink-500 ";
    } else if (variant === 'outline') {
      classes += "bg-transparent text-pink-600 border border-pink-600 hover:bg-pink-50 focus:ring-pink-500 ";
    } else if (variant === 'ghost') {
      classes += "bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-pink-500 ";
    }
    
    // Add size-specific classes
    if (size === 'sm') {
      classes += "px-2 py-1 text-xs ";
    } else if (size === 'md') {
      classes += "px-3 py-2 text-sm ";
    } else if (size === 'lg') {
      classes += "px-4 py-2 text-base ";
    }
    
    // Add disabled styling
    if (isShareDisabled) {
      classes += "opacity-50 cursor-not-allowed ";
    }
    
    // Add any additional custom classes
    if (className) {
      classes += className;
    }
    
    return classes;
  };
  
  return (
    <button
      type="button"
      onClick={handleShareClick}
      className={getButtonClasses()}
      disabled={isShareDisabled} // Only truly disable if not loading and no ID/error
      title={loading ? "Data is uploading (click to view progress)" : 
             isShareDisabled ? "Upload data first or check error" : 
             "Share dashboard"}
    >
      {icon && (
        <ShareIcon className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'} ${buttonText ? 'mr-1' : ''}`} />
      )}
      {buttonText}
    </button>
  );
};

export default ShareButton;
