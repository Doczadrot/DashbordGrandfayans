import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', title, ...props }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`glass-card p-6 ${className}`}
      {...props}
    >
      {title && <h3 className="text-xl font-semibold mb-4 text-white">{title}</h3>}
      {children}
    </motion.div>
  );
};