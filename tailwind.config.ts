import type { Config } from 'tailwindcss';

/**
 * Tailwind is configured without Preflight (BuildSpec §11: no global CSS
 * resets — the Lovable host site has its own). Base styles are scoped to the
 * `.sh-explorer` feature root in src/index.css instead. All colours resolve
 * to the CSS custom properties in src/styles/tokens.css, the single file to
 * edit during transfer.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        'sh-solar': 'var(--sh-solar)',
        'sh-deep': 'var(--sh-deep)',
        'sh-teal': 'var(--sh-teal)',
        'sh-sand': 'var(--sh-sand)',
        'sh-ink': 'var(--sh-ink)',
        'sh-muted': 'var(--sh-muted)',
        'sh-rule': 'var(--sh-rule)',
        'sh-surface': 'var(--sh-surface)',
        'sh-lik-1': 'var(--sh-lik-1)',
        'sh-lik-2': 'var(--sh-lik-2)',
        'sh-lik-3': 'var(--sh-lik-3)',
        'sh-lik-4': 'var(--sh-lik-4)',
        'sh-lik-5': 'var(--sh-lik-5)',
        'sh-employee': 'var(--sh-employee)',
        'sh-employer': 'var(--sh-employer)',
        'sh-employee-soft': 'var(--sh-employee-soft)',
        'sh-employer-soft': 'var(--sh-employer-soft)',
        'sh-alert': 'var(--sh-alert)',
        'sh-warn-bg': 'var(--sh-warn-bg)',
      },
      // §5.2 heading scale: 40 / 28 / 20 / 16, body 16, chart labels 13, ticks 12.
      fontSize: {
        'sh-h1': ['40px', { lineHeight: '1.15', fontWeight: '700' }],
        'sh-h2': ['28px', { lineHeight: '1.2', fontWeight: '650' }],
        'sh-h3': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'sh-h4': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'sh-body': ['16px', { lineHeight: '1.6' }],
        'sh-chart': ['13px', { lineHeight: '1.4' }],
        'sh-tick': ['12px', { lineHeight: '1.3' }],
      },
      maxWidth: {
        'sh-content': '1200px', // §5.2 grid
      },
      borderRadius: {
        'sh-card': '12px',
      },
      spacing: {
        'sh-module': '64px', // §5.2 vertical separation between modules
      },
    },
  },
  plugins: [],
} satisfies Config;
