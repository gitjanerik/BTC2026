/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        paper: '#efe4cc',
        deep: '#e0cfa8',
        orange: {
          DEFAULT: '#d9601f',
          dark: '#b84d13',
        },
        sovred: '#a8291d',
        mustard: '#c9a24a',
        forest: '#4a5d3a',
        ink: '#2a1810',
      },
      fontFamily: {
        display: ['"Russo One"', 'sans-serif'],
        body: ['Spectral', 'Georgia', 'serif'],
      },
      boxShadow: {
        stamp: '4px 4px 0 0 #2a1810',
        'stamp-sm': '2px 2px 0 0 #2a1810',
      },
    },
  },
  plugins: [],
};
