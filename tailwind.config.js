/** @type {import('tailwindcss').Config} */
export default {
  // Tell Tailwind which files to scan for class names
  // It removes unused CSS classes from the final build (tree-shaking)
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom color palette — keep money UI feeling trustworthy, not flashy
      colors: {
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        surface: {
          DEFAULT: '#0f172a',  // main dark background
          card:    '#1e293b',  // card background
          border:  '#334155',  // border color
          muted:   '#475569',  // muted text
        }
      },
      fontFamily: {
        // DM Sans — clean, modern, slightly geometric. Good for numbers/finance
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        // DM Mono for amounts, IDs, UPI handles
        mono: ['DM Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
}
