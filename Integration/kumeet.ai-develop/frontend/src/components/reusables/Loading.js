import React from 'react';

const Loading = ({ 
  size = 'md', 
  color = 'purple', 
  className = '', 
  fullScreen = false,
  text = 'Loading...'
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-[6px]'
  };
  
  // Color classes
  const colorClasses = {
    purple: 'border-purple-200 border-t-purple-600',
    gray: 'border-gray-200 border-t-gray-600',
    blue: 'border-blue-200 border-t-blue-600'
  };
  
  const spinnerClasses = `rounded-full animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`;
  
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-80 flex justify-center items-center z-50">
        <div className="flex flex-col items-center">
          <div className={spinnerClasses}></div>
          {text && <p className="mt-4 text-gray-600">{text}</p>}
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center my-4">
      <div className={spinnerClasses}></div>
      {text && <p className="mt-2 text-sm text-gray-500">{text}</p>}
    </div>
  );
};

export default Loading;