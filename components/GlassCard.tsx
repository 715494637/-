import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  intensity?: 'low' | 'medium' | 'high';
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className, 
  intensity = 'medium',
  ...props 
}) => {
  
  const bgStyles = {
    low: 'bg-white/40 backdrop-blur-md border-white/40 shadow-sm',
    medium: 'bg-white/60 backdrop-blur-lg border-white/50 shadow-md',
    high: 'bg-white/85 backdrop-blur-xl border-white/60 shadow-xl',
  };

  return (
    <div 
      className={cn(
        "rounded-2xl border transition-all duration-300",
        bgStyles[intensity],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};