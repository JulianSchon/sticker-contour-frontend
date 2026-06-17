import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // `white` is driven by a CSS variable so the whole UI (text-white,
        // white/x borders & overlays, incl. hover variants) flips between the
        // dark (Vader) and light (Obi-Wan) themes. See index.css [data-theme].
        white: 'rgb(var(--w) / <alpha-value>)',
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
