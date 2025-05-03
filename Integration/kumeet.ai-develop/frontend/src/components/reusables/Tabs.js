import React from 'react';

const TabGroup = ({ children, className = '', ...props }) => {
  return (
    <div className={`border-b border-gray-200 ${className}`} {...props}>
      <div className="flex">{children}</div>
    </div>
  );
};

const Tab = ({ 
  label, 
  active = false, 
  icon, 
  onClick, 
  className = '', 
  ...props 
}) => {
  return (
    <button
      className={`px-4 py-3 flex items-center ${
        active 
          ? 'border-b-2 border-purple-600 text-purple-600 font-medium' 
          : 'text-gray-600 hover:text-gray-800 hover:border-b-2 hover:border-gray-300'
      } ${className}`}
      onClick={onClick}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

export { TabGroup, Tab };
