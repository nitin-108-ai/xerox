/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060D17',
          900: '#0B192C',
          800: '#152A4A',
          700: '#1E3E62',
          600: '#2A5285',
        },
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#0066FF',
          600: '#0052CC',
          700: '#003D99',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(11, 25, 44, 0.08)',
        'elevated': '0 12px 24px -4px rgba(11, 25, 44, 0.12), 0 4px 8px -2px rgba(11, 25, 44, 0.06)',
      }
    },
  },
  plugins: [],
}
