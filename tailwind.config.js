/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Little Frets brand palette — burnt orange + black on warm cream
        sand: {
          50: '#fbf7f2',
          100: '#f5ece1',
          200: '#ead7c2',
          300: '#dcbb9b',
          400: '#cb9a6f',
          500: '#bd8052',
          600: '#a86644',
          700: '#8a5138',
          800: '#6f4230',
          900: '#5a3729',
        },
        sage: {
          // now the primary brand ORANGE accent (kept the key name so no
          // component files need to change)
          50: '#fdf3e7',
          100: '#fae4c6',
          200: '#f3c98c',
          300: '#eaa752',
          400: '#de8a2f',
          500: '#c8792e',
          600: '#a86323',
          700: '#854e1c',
          800: '#663d17',
          900: '#4a2c11',
        },
        ink: {
          // now true black/charcoal to match the logo, instead of warm brown
          50: '#f5f5f5',
          100: '#e5e5e5',
          200: '#cccccc',
          300: '#a3a3a3',
          400: '#737373',
          500: '#525252',
          600: '#3f3f3f',
          700: '#262626',
          800: '#171717',
          900: '#0a0a0a',
        },
      },
      fontFamily: {
        sans: ['"Nunito"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 2px 12px -2px rgba(10, 10, 10, 0.10), 0 1px 3px -1px rgba(10, 10, 10, 0.08)',
        lift: '0 8px 30px -6px rgba(10, 10, 10, 0.15), 0 2px 8px -2px rgba(10, 10, 10, 0.10)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};