// src/components/sharing/ShareButton.js
import React from 'react';
import { useSharing } from '../../context/SharingContext';
import { useData } from '../../context/DataContext';

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
  const { openSharingModal } = useSharing();
  
  // Access data context for upload status
  const { 
    loading, 
    currentDatasetStorageId, 
    error: dataError,
    salesData,
    offerData
  } = useData();
  
  // Check if there's any data to share
  const hasData = (salesData && salesData.length > 0) || (offerData && offerData.length > 0);
  
  // Determine if the button should be disabled 
  // The button should be enabled if:
  // 1. Data is currently loading (to show upload progress) OR
  // 2. We have a valid storage ID (data is uploaded to storage) OR
  // 3. We have data (even if not yet uploaded to storage, we can try to upload on demand)
  const isShareDisabled = !loading && !currentDatasetStorageId && !hasData;
  
  // Determine appropriate button text
  const buttonText = loading ? "Uploading..." :
                    (!currentDatasetStorageId && !hasData) ? "Upload data first" :
                    (!currentDatasetStorageId && hasData) ? "Share (local mode)" :
                    label;
  
  // Handle share button click
  const handleShareClick = () => {
    // Allow opening the modal:
    // - If data is still uploading (to show progress)
    // - If we have a storage ID
    // - If we have data but no storage ID (try to upload on demand)
    if (loading || currentDatasetStorageId || hasData) {
      openSharingModal();
    } else {
      console.log("Cannot share: " + (loading ? "Data is still uploading" : "No data has been uploaded"));
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
      disabled={isShareDisabled} 
      title={loading ? "Data is uploading (click to view progress)" : 
             isShareDisabled ? "Upload data first" : 
             !currentDatasetStorageId && hasData ? "Share with local storage mode" :
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