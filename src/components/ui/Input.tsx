import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', disabled, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="block text-sm font-medium text-[var(--stone-700)]">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--stone-400)]">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            disabled={disabled}
            className={`
              w-full px-4 py-3 rounded-xl border bg-white/80 backdrop-blur-sm
              text-[var(--stone-900)] text-sm
              placeholder:text-[var(--stone-400)]
              transition-all duration-200
              focus:outline-none focus:ring-2
              ${leftIcon ? 'pl-11' : ''}
              ${rightIcon ? 'pr-11' : ''}
              ${
                error
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                  : 'border-[var(--stone-200)] focus:border-[var(--coral-400)] focus:ring-[var(--coral-100)]'
              }
              ${disabled ? 'opacity-60 cursor-not-allowed bg-[var(--stone-50)]' : ''}
              ${className}
            `}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-[var(--stone-400)]">
              {rightIcon}
            </div>
          )}
        </div>

        {(error || helperText) && (
          <p className={`text-xs ${error ? 'text-red-500' : 'text-[var(--stone-500)]'}`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
