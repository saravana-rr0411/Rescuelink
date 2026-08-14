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
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 select-none';

  const variantStyles = {
    primary:
      'bg-blue-600 hover:bg-blue-700 text-white shadow-sm border border-blue-600',
    secondary:
      'bg-slate-100 hover:bg-slate-200 text-slate-800 shadow-sm border border-slate-200',
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border border-emerald-500/40',
    warning:
      'bg-amber-100 hover:bg-amber-200 text-amber-800 shadow-sm border border-amber-200',
    danger:
      'bg-red-600 hover:bg-red-700 text-white shadow-sm border border-red-500/40',
    outline:
      'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-sm',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-600',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-xs gap-1.5 min-h-[36px]',
    md: 'px-5 py-2.5 text-sm gap-2 min-h-[44px]',
    lg: 'px-6 py-3 text-base gap-2.5 min-h-[52px]',
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
