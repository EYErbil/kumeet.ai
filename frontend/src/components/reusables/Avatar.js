import React from 'react';

const Avatar = ({ 
  src, 
  alt, 
  name,
  size = 'md', 
  className = '',
  ...props 
}) => {
  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Size classes
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  };
  
  const avatarClasses = `rounded-full flex items-center justify-center overflow-hidden ${sizeClasses[size]} ${className}`;
  
  return (
    <div className={avatarClasses} {...props}>
      {src ? (
        <img 
          src={src} 
          alt={alt || name || 'Avatar'} 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="bg-purple-100 text-purple-800 w-full h-full flex items-center justify-center font-medium">
          {getInitials(name)}
        </div>
      )}
    </div>
  );
};

// Avatar group component for stacked avatars
const AvatarGroup = ({ 
  users, 
  max = 4, 
  size = 'sm', 
  className = '',
  ...props 
}) => {
  const displayUsers = users.slice(0, max);
  const remainingCount = users.length - max;
  
  return (
    <div className={`flex -space-x-2 ${className}`} {...props}>
      {displayUsers.map((user, index) => (
        <Avatar 
          key={index} 
          src={user.avatar} 
          name={user.name} 
          size={size}
          className="border-2 border-white"
        />
      ))}
      
      {remainingCount > 0 && (
        <div className={`${Avatar({size}).props.className} bg-gray-100 text-gray-600 border-2 border-white flex items-center justify-center font-medium`}>
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export { Avatar, AvatarGroup };