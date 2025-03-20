import React from 'react';

/**
 * Button component - A reusable button component with various styles
 * 
 * @param {Object} props - Component props
 * @param {string} [props.variant='primary'] - Button style variant (primary, secondary, outline, ghost)
 * @param {string} [props.size='md'] - Button size (sm, md, lg)
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.disabled=false] - Disable the button
 * @param {function} props.onClick - Click handler
 * @param {React.ReactNode} props.children - Button content
 * @param {string} [props.type='button'] - Button type attribute
 * @param {React.ReactNode} [props.icon] - Optional icon component
 * @param {boolean} [props.iconOnly=false] - Whether button contains only an icon
 * @param {boolean} [props.fullWidth=false] - Whether button should take full width
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  onClick,
  children,
  type = 'button',
  icon,
  iconOnly = false,
  fullWidth = false,
  ...rest
}) => {
  // Base classes
  let classes = "inline-flex items-center justify-center rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ";
  
  // Add variant-specific classes
  if (variant === 'primary') {
    classes += disabled
      ? "bg-pink-300 text-white cursor-not-allowed dark:bg-pink-900/50 "
      : "bg-pink-600 text-white hover:bg-pink-700 focus:ring-pink-500 ";
  } else if (variant === 'secondary') {
    classes += disabled
      ? "bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500 dark:border-gray-600 "
      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-pink-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 ";
  } else if (variant === 'outline') {
    classes += disabled
      ? "bg-transparent text-gray-400 border border-gray-300 cursor-not-allowed dark:text-gray-500 dark:border-gray-600 "
      : "bg-transparent text-pink-600 border border-pink-600 hover:bg-pink-50 focus:ring-pink-500 dark:text-pink-400 dark:border-pink-400 dark:hover:bg-pink-900/20 ";
  } else if (variant === 'ghost') {
    classes += disabled
      ? "bg-transparent text-gray-400 cursor-not-allowed dark:text-gray-500 "
      : "bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-pink-500 dark:text-gray-300 dark:hover:bg-gray-700 ";
  } else if (variant === 'danger') {
    classes += disabled
      ? "bg-red-300 text-white cursor-not-allowed dark:bg-red-900/50 "
      : "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 ";
  } else if (variant === 'success') {
    classes += disabled
      ? "bg-green-300 text-white cursor-not-allowed dark:bg-green-900/50 "
      : "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 ";
  }
  
  // Add size-specific classes
  if (size === 'sm') {
    classes += iconOnly ? "p-1.5 " : "px-2.5 py-1.5 text-xs ";
  } else if (size === 'md') {
    classes += iconOnly ? "p-2 " : "px-4 py-2 text-sm ";
  } else if (size === 'lg') {
    classes += iconOnly ? "p-2.5 " : "px-5 py-2.5 text-base ";
  }
  
  // Add full width class if needed
  if (fullWidth) {
    classes += "w-full ";
  }
  
  // Add any custom classes
  if (className) {
    classes += className;
  }
  
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {icon && (
        <span className={iconOnly ? "" : (children ? "mr-2" : "")}>
          {icon}
        </span>
      )}
      {children}
    </button>
  );
};

export default Button;