import React, { useState, useRef, useEffect } from 'react';

const InlineEdit = ({ 
  value, 
  onSave, 
  placeholder = "Click to edit",
  className = "",
  inputClassName = "",
  canEdit = true,
  maxLength = 50,
  multiline = false,
  validation = null // function that returns error message or null
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (!canEdit) return;
    setIsEditing(true);
    setError('');
  };

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    
    // Run validation if provided
    if (validation) {
      const validationError = validation(trimmedValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    
    onSave(trimmedValue);
    setIsEditing(false);
    setError('');
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
    setError('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const displayValue = value || placeholder;
  const InputComponent = multiline ? 'textarea' : 'input';

  if (isEditing) {
    return (
      <div className="inline-edit-container">
        <div className="flex items-center gap-2">
          <InputComponent
            ref={inputRef}
            type={multiline ? undefined : "text"}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            maxLength={maxLength}
            className={`${inputClassName} px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${multiline ? 'resize-none' : ''}`}
            rows={multiline ? 3 : undefined}
            placeholder={placeholder}
          />
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
              title="Save"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              title="Cancel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${className} inline-edit-display ${canEdit ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-1 py-0.5 transition-colors' : ''} ${!value ? 'text-gray-500 dark:text-gray-400 italic' : ''}`}
      onClick={handleEdit}
      title={canEdit ? "Click to edit" : ""}
    >
      <span className="break-words">{displayValue}</span>
      {canEdit && (
        <svg className="inline ml-1 w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )}
    </div>
  );
};

export default InlineEdit;