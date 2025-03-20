import React, { useEffect, useRef } from 'react';
import Icon from './Icon';
import Button from './Button';

/**
 * Modal component - A reusable modal dialog
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {function} props.onClose - Function to call when the modal is closed
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {React.ReactNode} [props.footer] - Optional footer content
 * @param {string} [props.size='md'] - Modal size (sm, md, lg, xl, full)
 * @param {boolean} [props.closeOnEsc=true] - Whether to close the modal when pressing ESC
 * @param {boolean} [props.closeOnClickOutside=true] - Whether to close when clicking outside
 * @param {string} [props.className] - Additional CSS classes for the modal
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnEsc = true,
  closeOnClickOutside = true,
  className = '',
}) => {
  const modalRef = useRef(null);
  
  // Handle keyboard events (ESC key)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (closeOnEsc && event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent scrolling on the body when modal is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore scrolling when component unmounts or modal is closed
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, closeOnEsc]);
  
  // Handle clicks outside the modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        closeOnClickOutside &&
        modalRef.current && 
        !modalRef.current.contains(event.target) && 
        isOpen
      ) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, closeOnClickOutside]);
  
  // Size classes for the modal
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-50 transition-opacity duration-300"
        aria-hidden="true"
      />
      
      {/* Modal container */}
      <div className="flex items-center justify-center min-h-screen p-4 text-center">
        {/* Modal panel */}
        <div 
          ref={modalRef}
          className={`w-full ${sizeClasses[size] || sizeClasses.md} p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl transform transition-all duration-300 text-left align-middle ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 
              id="modal-title"
              className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
            >
              {title}
            </h3>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              aria-label="Close"
              iconOnly
              icon={<Icon name="xMark" />}
            />
          </div>
          
          {/* Body */}
          <div>
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="mt-6 flex justify-end">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;