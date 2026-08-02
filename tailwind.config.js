/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#b7131a',
          container: '#db322f',
          fixed: '#ffdad6',
          'fixed-dim': '#ffb4ac',
          hover: '#93000d',
        },
        secondary: {
          DEFAULT: '#005faf',
          container: '#54a0fe',
          fixed: '#d4e3ff',
          'fixed-dim': '#a5c8ff',
        },
        tertiary: {
          DEFAULT: '#924700',
          container: '#b75b00',
          fixed: '#ffdcc6',
        },
        surface: {
          DEFAULT: '#fcf9f8',
          dim: '#dcd9d9',
          bright: '#fcf9f8',
          variant: '#e5e2e1',
          container: {
            lowest: '#ffffff',
            low: '#f6f3f2',
            DEFAULT: '#f0edec',
            high: '#ebe7e7',
            highest: '#e5e2e1',
          }
        },
        'on-surface': {
          DEFAULT: '#1c1b1b',
          variant: '#5b403d',
        },
        outline: {
          DEFAULT: '#906f6c',
          variant: '#e4beb9',
        },
        emergency: {
          red: '#b7131a',
          blue: '#005faf',
          orange: '#924700',
          green: '#166534',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'level-1': '0px 2px 8px rgba(0, 0, 0, 0.04)',
        'level-2': '0px 4px 20px rgba(0, 0, 0, 0.08)',
        'level-3': '0px 8px 32px rgba(0, 0, 0, 0.12)',
        'sos': '0 0 0 12px rgba(183, 19, 26, 0.15), 0 0 0 24px rgba(183, 19, 26, 0.08)',
      }
    },
  },
  plugins: [],
}
