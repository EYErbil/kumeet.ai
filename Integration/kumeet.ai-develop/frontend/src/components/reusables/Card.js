import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
};

const CardHeader = ({ 
  title, 
  subtitle, 
  action, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`p-4 border-b border-gray-100 flex justify-between items-center ${className}`} {...props}>
      <div>
        {title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>}
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

const CardBody = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

const CardFooter = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`p-4 border-t border-gray-100 ${className}`} {...props}>
      {children}
    </div>
  );
};

export { Card, CardHeader, CardBody, CardFooter };