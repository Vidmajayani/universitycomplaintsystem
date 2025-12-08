/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // enables 'dark' class for dark mode
  content: [
    "./index.html",
    "./src/**/*.{html,js}",
  ],
  theme: {
    extend: {
      colors: {

        greenvine: {
          light: 'var(--color-blue-light-btn)',
          DEFAULT: 'var(--color-blue-btn)',
          dark: 'var(--color-green-dark)',
        },
        eco: {
          light: 'var(--color-eco-light)',
          DEFAULT: 'var(--color-eco)',
          dark: 'var(--color-eco-dark)',
        },

        pending: '#EF5350',   // Red — Pending
        progress: '#FBC02D',  // Yellow — In Progress
        resolved: '#66BB6A',  // Green — Resolved

      },

      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        heading: ['"Literata"', 'serif'],
      },
      //to remove
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },

      borderRadius: {
        'xl': '1.5rem',
      },

      boxShadow: {
        'green': '0 4px 6px -1px rgba(16, 185, 129, 0.5)',
        'eco': '0 4px 6px -1px rgba(132, 204, 22, 0.5)',
      },

      screens: {
        'fold': '280px',
        'mobile': { 'max': '655px' }, // custom mobile breakpoint 
      },
      animation: {
        'fade-in': 'fadeIn 1.5s ease-in forwards',
        'pulse-slow': 'pulse 2s infinite',
        'wiggle': 'wiggle 0.5s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        'card-hover': 'cardHover 300ms ease-in-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        cardHover: {
          '0%': {
            transform: 'scale(1)',
            boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
          },
          '100%': {
            transform: 'scale(1.03)',
            boxShadow: '0 10px 15px rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },
  },
  plugins: [],
};