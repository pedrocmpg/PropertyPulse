import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'premium-text': 'var(--color-premium-text)',
        'premium-bg': 'var(--color-premium-bg)',
        'premium-text-low': 'var(--color-premium-text-low-intensity)',
        'premium-bg-low': 'var(--color-premium-bg-low-intensity)',
        'discount-text': 'var(--color-discount-text)',
        'discount-bg': 'var(--color-discount-bg)',
        'discount-text-low': 'var(--color-discount-text-low-intensity)',
        'discount-bg-low': 'var(--color-discount-bg-low-intensity)',
        'neutral-text': 'var(--color-neutral-text)',
        'neutral-bg': 'var(--color-neutral-bg)',
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-tertiary': 'var(--color-bg-tertiary)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',
        'border-primary': 'var(--color-border-primary)',
        'border-secondary': 'var(--color-border-secondary)',
      },
      spacing: {
        'xs': 'var(--spacing-xs)',
        'sm': 'var(--spacing-sm)',
        'md': 'var(--spacing-md)',
        'lg': 'var(--spacing-lg)',
        'xl': 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
        '3xl': 'var(--spacing-3xl)',
      },
      transitionDuration: {
        '150': 'var(--transition-duration-short)',
        '300': 'var(--transition-duration-standard)',
        '500': 'var(--transition-duration-long)',
      },
      animation: {
        'fade-in': 'fadeIn var(--transition-duration-standard) var(--transition-easing-ease-out)',
        'spin': 'spin 1s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      screens: {
        // Responsive breakpoints for FII Dashboard
        // Mobile: < 768px (grid-cols-1)
        // Tablet: 768px - 1024px (md:grid-cols-2)
        // Desktop: > 1024px (lg:grid-cols-3+)
        'sm': '640px',   // Small devices (mobile landscape)
        'md': '768px',   // Tablets start here
        'lg': '1024px',  // Desktop breakpoint
        'xl': '1280px',  // Large desktop
        '2xl': '1536px', // Extra large desktop
      },
    },
  },
  plugins: [],
};

export default config;
