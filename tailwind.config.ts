import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nim: {
          yellow:      '#ffed00',
          yellowHover: '#f0e000',
          black:       '#000000',
          dark:        '#111111',
          darker:      '#0a0a0a',
          white:       '#ffffff',
        },
      },
      fontFamily: {
        display: ['Impact', 'Haettenschweiler', 'Arial Narrow Bold', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
