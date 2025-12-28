import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  icon?: ReactNode;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  className = '',
  title,
  description,
  icon,
  hover = false,
  padding = 'md',
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`card ${hover ? 'card-hover' : ''} ${className}`}
    >
      {(title || description || icon) && (
        <div className="px-6 pt-6 pb-4 border-b border-[var(--stone-100)]">
          <div className="flex items-start gap-4">
            {icon && (
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--coral-50)] to-[var(--coral-100)] flex items-center justify-center text-[var(--coral-500)]">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="font-display text-xl font-semibold text-[var(--stone-900)] text-balance">
                  {title}
                </h3>
              )}
              {description && (
                <p className="caption mt-1 text-pretty">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`px-6 pt-6 pb-4 border-b border-[var(--stone-100)] ${className}`}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}
