// src/components/ThemeToggle.js
import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  
  return (
    <button
      onClick={toggleDarkMode}
      className="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 dark:focus:ring-offset-gray-800"
      role="switch"
      aria-checked={darkMode ? 'true' : 'false'}
    >
      <span className="sr-only">Toggle dark mode</span>
      <span
        className={`${
          darkMode ? 'bg-pink-600' : 'bg-gray-200'
        } relative inline-block h-6 w-11 rounded-full transition-colors duration-200 ease-in-out`}
      >
        <span
          className={`${
            darkMode ? 'translate-x-6 bg-gray-800' : 'translate-x-1 bg-white'
          } inline-block h-4 w-4 rounded-full transform transition duration-200 ease-in-out mt-1`}
        >
          {darkMode ? (
            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          ) : (
            <svg className="h-3 w-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
      </span>
    </button>
  );
};

export default ThemeToggle;