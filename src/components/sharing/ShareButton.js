import React from 'react';
import { useSharing } from '../../context/SharingContext';
import { useTheme } from '../../context/ThemeContext';

const ShareButton = () => {
  const { toggleShareModal } = useSharing();
  const { darkMode } = useTheme();
  
  return (
    <button 
      onClick={toggleShareModal}
      className={`
        ml-2 px-3 py-2 rounded-md text-sm font-medium flex items-center
        bg-purple-50 dark:bg-purple-900/30 
        text-purple-700 dark:text-purple-300 
        hover:bg-purple-100 dark:hover:bg-purple-800/40 
        transition-colors duration-150
      `}
      title="Share with client"
    >
      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
      Share
    </button>
  );
};

export default ShareButton;