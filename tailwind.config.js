/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm, friendly palette — amber/rose accents on warm neutrals
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
          50: '#f4f7f4',
          100: '#e6ede6',
          200: '#cddccd',
          300: '#a9c3a9',
          400: '#82a582',
          500: '#628862',
          600: '#4c6e4c',
          700: '#3d583d',
          800: '#324732',
          900: '#283a28',
        },
        ink: {
          50: '#f7f6f4',
          100: '#eeeae4',
          200: '#d9d2c8',
          300: '#b8ad9f',
          400: '#8e8174',
          500: '#6b5f54',
          600: '#544a41',
          700: '#3f3830',
          800: '#2a2520',
          900: '#1a1612',
        },
      },
      fontFamily: {
        sans: ['"Nunito"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 2px 12px -2px rgba(90, 55, 41, 0.08), 0 1px 3px -1px rgba(90, 55, 41, 0.06)',
        lift: '0 8px 30px -6px rgba(90, 55, 41, 0.12), 0 2px 8px -2px rgba(90, 55, 41, 0.08)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
