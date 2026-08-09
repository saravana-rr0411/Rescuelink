import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-extrabold rounded-2xl transition-all duration-150 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 select-none btn-press';

  const variantStyles = {
    primary:
      'bg-primary hover:bg-primary-hover text-white shadow-level-1 border border-primary-container/40',
    secondary:
      'bg-secondary hover:bg-secondary/90 text-white shadow-level-1 border border-secondary-container/40',
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-level-1 border border-emerald-500/40',
    warning:
      'bg-amber-600 hover:bg-amber-700 text-white shadow-level-1 border border-amber-500/40',
    danger:
      'bg-rose-700 hover:bg-rose-800 text-white shadow-level-1 border border-rose-600/40',
    outline:
      'bg-surface-container-lowest hover:bg-surface-container text-on-surface border border-outline-variant/60 shadow-xs',
    ghost:
      'bg-transparent hover:bg-surface-container text-on-surface-variant font-bold',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 min-h-[36px]',
    md: 'px-4 py-2.5 text-xs gap-2 min-h-[44px]',
    lg: 'px-5 py-3.5 text-sm gap-2.5 min-h-[52px]',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span className="truncate">{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};

export default Button;
