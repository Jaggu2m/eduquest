import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'flat';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  className = '',
  ...props
}) => {
  const styles = {
    glass:
      'bg-white/80 backdrop-blur-md border border-[#EAE2D5]/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]',
    solid: 'bg-white border border-stone-200 shadow-sm',
    flat: 'bg-[#F4EFEA]/60 border border-[#E5DDD2]/60',
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-200 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'ready' | 'processing' | 'scheduled' | 'published' | 'orange' | 'neutral';
  className?: string;
}> = ({ children, variant = 'neutral', className = '' }) => {
  const badgeStyles = {
    ready: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    processing: 'bg-amber-50 text-amber-700 border-amber-200/70 animate-pulse',
    scheduled: 'bg-sky-50 text-sky-700 border-sky-200/70',
    published: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
    orange: 'bg-orange-50 text-[#EA580C] border-orange-200/70',
    neutral: 'bg-stone-100 text-stone-600 border-stone-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
