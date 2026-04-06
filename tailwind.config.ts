import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nim: {
          yellow:  '#FFE600',
          yellowHover: '#F5DC00',
          black:   '#111111',
          dark:    '#1a1a1a',
          darker:  '#0d0d0d',
          white:   '#ffffff',
        },
      },
      fontFamily: {
        display: ['Impact', 'Haettenschweiler', 'Arial Narrow Bold', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
