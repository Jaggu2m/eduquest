import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-[#F4EFEA]/80 border ${
            error
              ? 'border-rose-400 focus:ring-rose-400'
              : 'border-[#E2D8CC] focus:border-[#EA580C] focus:ring-[#EA580C]/20'
          } rounded-xl px-4 py-2.5 text-stone-800 text-sm placeholder-stone-400 transition-all focus:outline-none focus:ring-3 ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-stone-500">{helperText}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
