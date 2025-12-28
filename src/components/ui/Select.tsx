import { forwardRef, SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className = '', disabled, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="label">{label}</label>
        )}
        <div className="relative">
          <select
            ref={ref}
            disabled={disabled}
            className={`
              input-base pr-10 appearance-none cursor-pointer
              ${error ? 'border-red-400 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' : ''}
              ${className}
            `}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--stone-400)] pointer-events-none" />
        </div>

        {(error || helperText) && (
          <p className={`caption ${error ? '!text-red-500' : ''}`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
