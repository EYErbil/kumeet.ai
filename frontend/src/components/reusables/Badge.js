import React from 'react';

const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  // Base classes
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-0.5'
  };
  
  // Variant classes
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-purple-100 text-purple-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };
  
  // Combine all classes
  const badgeClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
  
  return (
    <span className={badgeClasses} {...props}>
      {children}
    </span>
  );
};

export default Badge;