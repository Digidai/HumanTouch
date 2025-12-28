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
          <label className="block text-sm font-medium text-[var(--stone-700)]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            disabled={disabled}
            className={`
              w-full px-4 py-3 pr-10 rounded-xl border bg-white/80 backdrop-blur-sm
              text-[var(--stone-900)] text-sm appearance-none cursor-pointer
              transition-all duration-200
              focus:outline-none focus:ring-2
              ${
                error
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                  : 'border-[var(--stone-200)] focus:border-[var(--coral-400)] focus:ring-[var(--coral-100)]'
              }
              ${disabled ? 'opacity-60 cursor-not-allowed bg-[var(--stone-50)]' : ''}
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
          <p className={`text-xs ${error ? 'text-red-500' : 'text-[var(--stone-500)]'}`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
