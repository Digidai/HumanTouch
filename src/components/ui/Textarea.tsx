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
          <label className="label">{label}</label>
        )}
        <textarea
          ref={ref}
          disabled={disabled}
          className={`
            input-base leading-relaxed resize-none
            ${error ? 'border-red-400 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' : ''}
            ${className}
          `}
          rows={4}
          {...props}
        />

        {(error || helperText) && (
          <p className={`caption ${error ? '!text-red-500' : ''}`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
