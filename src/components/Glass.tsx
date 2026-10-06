import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

export interface GlassProps extends HTMLMotionProps<'div'> {
  children?: React.ReactNode;
  className?: string;
}

export const Glass = forwardRef<HTMLDivElement, GlassProps>(
  ({ children, className = '', style, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={`liquid-glass-base ${className}`}
        style={style}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Glass.displayName = 'Glass';
