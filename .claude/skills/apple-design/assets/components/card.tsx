/**
 * Apple-style Card Components
 *
 * Usage:
 * import { Card, CardInteractive, CardGlass } from './card';
 *
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *     <CardDescription>Description</CardDescription>
 *   </CardHeader>
 *   <CardContent>Content here</CardContent>
 * </Card>
 */

import { forwardRef, HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variants = {
  default: `
    bg-white dark:bg-[#1C1C1E]
    shadow-[0_2px_8px_rgba(0,0,0,0.08)]
    dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]
  `,
  elevated: `
    bg-white dark:bg-[#2C2C2E]
    shadow-[0_4px_12px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.06)]
    dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)]
  `,
  glass: `
    bg-white/70 dark:bg-[#1C1C1E]/70
    backdrop-blur-xl backdrop-saturate-[180%]
    border border-white/20 dark:border-white/10
  `,
  outline: `
    bg-transparent
    border border-[#E5E5EA] dark:border-[#3A3A3C]
  `,
};

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-2xl
          ${variants[variant]}
          ${paddings[padding]}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Interactive Card (clickable)
interface CardInteractiveProps extends CardProps {
  onClick?: () => void;
}

export const CardInteractive = forwardRef<HTMLDivElement, CardInteractiveProps>(
  ({ variant = 'default', padding = 'md', className = '', onClick, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        className={`
          rounded-2xl cursor-pointer
          ${variants[variant]}
          ${paddings[padding]}
          transition-all duration-200 ease-out
          hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]
          dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]
          hover:scale-[1.02]
          active:scale-[0.98]
          focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:ring-offset-2
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardInteractive.displayName = 'CardInteractive';

// Card Header
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`mb-4 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// Card Title
interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={`
          text-[20px] font-semibold leading-[25px]
          text-[#000000] dark:text-white
          ${className}
        `}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

// Card Description
interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`
          text-[15px] leading-[20px]
          text-[#3C3C43]/60 dark:text-[#EBEBF5]/60
          mt-1
          ${className}
        `}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

// Card Content
interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

// Card Footer
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          mt-4 pt-4
          border-t border-[#E5E5EA] dark:border-[#3A3A3C]
          flex items-center gap-3
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

// Card Image
interface CardImageProps extends HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
  aspectRatio?: 'square' | 'video' | 'wide';
}

export const CardImage = forwardRef<HTMLDivElement, CardImageProps>(
  ({ src, alt, aspectRatio = 'video', className = '', ...props }, ref) => {
    const ratios = {
      square: 'aspect-square',
      video: 'aspect-video',
      wide: 'aspect-[21/9]',
    };

    return (
      <div
        ref={ref}
        className={`
          -mx-5 -mt-5 mb-4
          overflow-hidden
          rounded-t-2xl
          ${ratios[aspectRatio]}
          ${className}
        `}
        {...props}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
);

CardImage.displayName = 'CardImage';

// Feature Card (with icon)
interface FeatureCardProps extends HTMLAttributes<HTMLDivElement> {
  icon: ReactNode;
  title: string;
  description: string;
}

export const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ icon, title, description, className = '', ...props }, ref) => {
    return (
      <Card ref={ref} className={className} {...props}>
        <div className="
          w-12 h-12 mb-4
          flex items-center justify-center
          bg-[#007AFF]/10 dark:bg-[#0A84FF]/20
          text-[#007AFF] dark:text-[#0A84FF]
          rounded-xl
        ">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </Card>
    );
  }
);

FeatureCard.displayName = 'FeatureCard';
