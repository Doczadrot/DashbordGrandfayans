import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface IOSButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
  as?: React.ElementType;
}

export const IOSButton: React.FC<IOSButtonProps> = ({ variant = 'primary', className = '', children, as, ...props }) => {
  const baseClass = 'btn-ios';
  let variantClass = 'btn-primary';
  if (variant === 'secondary') variantClass = 'btn-secondary';
  if (variant === 'danger') variantClass = 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20';
  
  if (as && as !== motion.button) {
    const Component = as;
    return (
      <Component 
        className={`${baseClass} ${variantClass} ${className}`} 
        {...props}
      >
        {children}
      </Component>
    );
  }

  return (
    <motion.button 
      whileTap={{ scale: 0.95 }}
      className={`${baseClass} ${variantClass} ${className}`} 
      {...props}
    >
      {children}
    </motion.button>
  );
};
