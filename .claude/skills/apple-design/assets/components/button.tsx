/**
 * Apple-style Button Components
 *
 * Usage:
 * import { Button, ButtonSecondary, ButtonDestructive } from './button';
 *
 * <Button>Continue</Button>
 * <ButtonSecondary>Cancel</ButtonSecondary>
 * <ButtonDestructive>Delete</ButtonDestructive>
 */

import { forwardRef, ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'text';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants = {
  primary: `
    bg-[#007AFF] text-white
    hover:bg-[#0066CC]
    focus:ring-[#007AFF]/50
    dark:bg-[#0A84FF] dark:hover:bg-[#0077ED]
  `,
  secondary: `
    bg-[#F2F2F7] text-[#007AFF]
    hover:bg-[#E5E5EA]
    dark:bg-[#2C2C2E] dark:text-[#0A84FF]
    dark:hover:bg-[#3A3A3C]
  `,
  destructive: `
    bg-[#FF3B30] text-white
    hover:bg-[#E6352B]
    focus:ring-[#FF3B30]/50
    dark:bg-[#FF453A] dark:hover:bg-[#E63E35]
  `,
  text: `
    bg-transparent text-[#007AFF]
    hover:bg-[#007AFF]/10
    dark:text-[#0A84FF]
    dark:hover:bg-[#0A84FF]/10
  `,
};

const sizes = {
  sm: 'px-3 py-1.5 text-[13px] min-w-[60px]',
  md: 'px-5 py-2.5 text-[15px] min-w-[80px]',
  lg: 'px-6 py-3 text-[17px] min-w-[100px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2
          font-semibold
          rounded-[10px]
          transition-all duration-200 ease-out
          active:scale-[0.98]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Convenience exports
export const ButtonPrimary = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="primary" {...props} />
);
ButtonPrimary.displayName = 'ButtonPrimary';

export const ButtonSecondary = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="secondary" {...props} />
);
ButtonSecondary.displayName = 'ButtonSecondary';

export const ButtonDestructive = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="destructive" {...props} />
);
ButtonDestructive.displayName = 'ButtonDestructive';

export const ButtonText = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="text" {...props} />
);
ButtonText.displayName = 'ButtonText';

// Icon Button
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'text', size = 'md', className = '', children, ...props }, ref) => {
    const iconSizes = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    };

    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center
          rounded-full
          transition-all duration-200 ease-out
          active:scale-[0.95]
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${variant === 'primary' ? 'bg-[#007AFF] text-white hover:bg-[#0066CC]' : ''}
          ${variant === 'secondary' ? 'bg-[#F2F2F7] text-[#007AFF] hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C]' : ''}
          ${variant === 'text' ? 'text-[#007AFF] hover:bg-[#007AFF]/10 dark:text-[#0A84FF]' : ''}
          ${variant === 'destructive' ? 'bg-[#FF3B30] text-white hover:bg-[#E6352B]' : ''}
          ${iconSizes[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
