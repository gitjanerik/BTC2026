/** @type {import('tailwindcss').Config} */
const rgbVar = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: rgbVar('--c-paper'),
        deep: rgbVar('--c-deep'),
        orange: {
          DEFAULT: rgbVar('--c-orange'),
          dark: rgbVar('--c-orange-dark'),
        },
        sovred: rgbVar('--c-sovred'),
        mustard: rgbVar('--c-mustard'),
        forest: rgbVar('--c-forest'),
        ink: rgbVar('--c-ink'),
      },
      fontFamily: {
        display: ['"Russo One"', 'sans-serif'],
        body: ['Spectral', 'Georgia', 'serif'],
      },
      boxShadow: {
        stamp: '4px 4px 0 0 rgb(var(--c-ink))',
        'stamp-sm': '2px 2px 0 0 rgb(var(--c-ink))',
      },
    },
  },
  plugins: [],
};
