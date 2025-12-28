import { forwardRef, TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', disabled, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="block text-sm font-medium text-[var(--stone-700)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          disabled={disabled}
          className={`
            w-full px-4 py-3 rounded-xl border bg-white/80 backdrop-blur-sm
            text-[var(--stone-900)] text-sm leading-relaxed
            placeholder:text-[var(--stone-400)]
            transition-all duration-200 resize-none
            focus:outline-none focus:ring-2
            ${
              error
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                : 'border-[var(--stone-200)] focus:border-[var(--coral-400)] focus:ring-[var(--coral-100)]'
            }
            ${disabled ? 'opacity-60 cursor-not-allowed bg-[var(--stone-50)]' : ''}
            ${className}
          `}
          rows={4}
          {...props}
        />

        {(error || helperText) && (
          <p className={`text-xs ${error ? 'text-red-500' : 'text-[var(--stone-500)]'}`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
