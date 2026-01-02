/**
 * Apple-style Navigation Components
 *
 * Usage:
 * import { Navbar, NavbarBrand, NavbarLinks, NavbarLink } from './navbar';
 *
 * <Navbar>
 *   <NavbarBrand>Logo</NavbarBrand>
 *   <NavbarLinks>
 *     <NavbarLink href="/" active>Home</NavbarLink>
 *     <NavbarLink href="/about">About</NavbarLink>
 *   </NavbarLinks>
 * </Navbar>
 */

import { forwardRef, HTMLAttributes, AnchorHTMLAttributes, useState, ReactNode } from 'react';

// Navbar Container
interface NavbarProps extends HTMLAttributes<HTMLElement> {
  variant?: 'default' | 'glass' | 'solid';
  sticky?: boolean;
}

export const Navbar = forwardRef<HTMLElement, NavbarProps>(
  ({ variant = 'glass', sticky = true, className = '', children, ...props }, ref) => {
    const variants = {
      default: 'bg-white dark:bg-[#1C1C1E]',
      glass: `
        bg-white/70 dark:bg-[#1C1C1E]/70
        backdrop-blur-xl backdrop-saturate-[180%]
        border-b border-[#3C3C43]/12 dark:border-[#545458]/65
      `,
      solid: 'bg-[#F2F2F7] dark:bg-[#000000]',
    };

    return (
      <nav
        ref={ref}
        className={`
          ${sticky ? 'fixed top-0 left-0 right-0 z-50' : ''}
          h-[44px]
          ${variants[variant]}
          ${className}
        `}
        {...props}
      >
        <div className="
          max-w-[980px] mx-auto
          h-full px-4
          flex items-center justify-between
        ">
          {children}
        </div>
      </nav>
    );
  }
);

Navbar.displayName = 'Navbar';

// Large Navbar (iOS-style with large title)
interface NavbarLargeProps extends HTMLAttributes<HTMLElement> {
  title: string;
  scrolled?: boolean;
}

export const NavbarLarge = forwardRef<HTMLElement, NavbarLargeProps>(
  ({ title, scrolled = false, className = '', children, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        className={`
          fixed top-0 left-0 right-0 z-50
          transition-all duration-300
          ${scrolled
            ? 'h-[44px] bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-xl border-b border-[#3C3C43]/12'
            : 'h-[96px] bg-[#F2F2F7] dark:bg-[#000000]'
          }
          ${className}
        `}
        {...props}
      >
        <div className="
          max-w-[980px] mx-auto
          h-full px-4
          flex flex-col justify-end
        ">
          {/* Top row */}
          <div className="flex items-center justify-between h-[44px]">
            {children}
          </div>

          {/* Large title (hidden when scrolled) */}
          <div
            className={`
              transition-all duration-300
              ${scrolled ? 'opacity-0 h-0' : 'opacity-100 h-[52px]'}
              overflow-hidden
            `}
          >
            <h1 className="text-[34px] font-bold leading-[41px] tracking-tight text-[#000000] dark:text-white">
              {title}
            </h1>
          </div>
        </div>
      </nav>
    );
  }
);

NavbarLarge.displayName = 'NavbarLarge';

// Navbar Brand
interface NavbarBrandProps extends HTMLAttributes<HTMLDivElement> {}

export const NavbarBrand = forwardRef<HTMLDivElement, NavbarBrandProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          flex items-center gap-2
          text-[17px] font-semibold
          text-[#000000] dark:text-white
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

NavbarBrand.displayName = 'NavbarBrand';

// Navbar Links Container
interface NavbarLinksProps extends HTMLAttributes<HTMLDivElement> {}

export const NavbarLinks = forwardRef<HTMLDivElement, NavbarLinksProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          flex items-center gap-6
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

NavbarLinks.displayName = 'NavbarLinks';

// Navbar Link
interface NavbarLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
}

export const NavbarLink = forwardRef<HTMLAnchorElement, NavbarLinkProps>(
  ({ active = false, className = '', children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={`
          text-[13px] font-normal
          transition-colors duration-200
          ${active
            ? 'text-[#000000] dark:text-white'
            : 'text-[#3C3C43]/60 dark:text-[#EBEBF5]/60 hover:text-[#000000] dark:hover:text-white'
          }
          ${className}
        `}
        {...props}
      >
        {children}
      </a>
    );
  }
);

NavbarLink.displayName = 'NavbarLink';

// Navbar Actions (right side)
interface NavbarActionsProps extends HTMLAttributes<HTMLDivElement> {}

export const NavbarActions = forwardRef<HTMLDivElement, NavbarActionsProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          flex items-center gap-4
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

NavbarActions.displayName = 'NavbarActions';

// Mobile Menu Button
interface MobileMenuButtonProps extends HTMLAttributes<HTMLButtonElement> {
  isOpen?: boolean;
}

export const MobileMenuButton = forwardRef<HTMLButtonElement, MobileMenuButtonProps>(
  ({ isOpen = false, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          md:hidden
          w-10 h-10
          flex flex-col items-center justify-center gap-1.5
          rounded-lg
          transition-colors duration-200
          hover:bg-[#007AFF]/10
          ${className}
        `}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        {...props}
      >
        <span
          className={`
            block w-5 h-0.5 bg-current
            transition-transform duration-200
            ${isOpen ? 'rotate-45 translate-y-2' : ''}
          `}
        />
        <span
          className={`
            block w-5 h-0.5 bg-current
            transition-opacity duration-200
            ${isOpen ? 'opacity-0' : ''}
          `}
        />
        <span
          className={`
            block w-5 h-0.5 bg-current
            transition-transform duration-200
            ${isOpen ? '-rotate-45 -translate-y-2' : ''}
          `}
        />
      </button>
    );
  }
);

MobileMenuButton.displayName = 'MobileMenuButton';

// Mobile Menu
interface MobileMenuProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
}

export const MobileMenu = forwardRef<HTMLDivElement, MobileMenuProps>(
  ({ isOpen, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          fixed inset-x-0 top-[44px]
          bg-white/95 dark:bg-[#1C1C1E]/95
          backdrop-blur-xl
          border-b border-[#3C3C43]/12 dark:border-[#545458]/65
          transition-all duration-300
          ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}
          ${className}
        `}
        {...props}
      >
        <div className="max-w-[980px] mx-auto px-4 py-6">
          <div className="flex flex-col gap-4">
            {children}
          </div>
        </div>
      </div>
    );
  }
);

MobileMenu.displayName = 'MobileMenu';

// Breadcrumb
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
}

export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  ({ items, className = '', ...props }, ref) => {
    return (
      <nav
        ref={ref}
        aria-label="Breadcrumb"
        className={`flex items-center gap-2 text-[13px] ${className}`}
        {...props}
      >
        {items.map((item, index) => (
          <span key={index} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-[#3C3C43]/30 dark:text-[#EBEBF5]/30">
                /
              </span>
            )}
            {item.href ? (
              <a
                href={item.href}
                className="text-[#007AFF] hover:underline"
              >
                {item.label}
              </a>
            ) : (
              <span className="text-[#3C3C43]/60 dark:text-[#EBEBF5]/60">
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>
    );
  }
);

Breadcrumb.displayName = 'Breadcrumb';
