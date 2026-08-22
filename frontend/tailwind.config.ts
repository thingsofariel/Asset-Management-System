import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        text: 'var(--color-text)',
        muted: 'var(--color-muted)',
        border: 'var(--color-border)',
        status: {
          good: 'var(--color-status-good)',
          maintenance: 'var(--color-status-maintenance)',
          repair: 'var(--color-status-repair)',
          scrap: 'var(--color-status-scrap)',
        },
        request: {
          open: 'var(--color-request-open)',
          accepted: 'var(--color-accent)',
          denied: 'var(--color-status-repair)',
          progress: 'var(--color-request-progress)',
          done: 'var(--color-status-good)',
          closed: 'var(--color-muted)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
    },
  },
  plugins: [],
};

export default config;
