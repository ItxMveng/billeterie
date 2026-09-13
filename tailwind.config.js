/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1.25rem', lg: '2rem' },
      screens: { '2xl': '1240px' },
    },
    extend: {
      colors: {
        /* Orange vitaminé — couleur d'action et d'énergie. */
        brand: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        /* Bleu nuit — profondeur, sérieux, contraste fort. */
        navy: {
          50: '#F2F7FB',
          100: '#E2EDF7',
          200: '#C0D7EC',
          300: '#8FB8DB',
          400: '#5590C3',
          500: '#2E6CA8',
          600: '#1F5285',
          700: '#17406A',
          800: '#0F2C4A',
          900: '#0A1F36',
          950: '#061426',
        },
        /* Fond crème — chaleur, évite le blanc clinique. */
        cream: {
          DEFAULT: '#FFF9F2',
          100: '#FFF4E8',
          200: '#FDEBD9',
        },
      },
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'Helvetica', 'Arial', 'sans-serif'],
        script: ['Caveat', 'cursive'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(10, 31, 54, 0.18)',
        lift: '0 22px 45px -20px rgba(10, 31, 54, 0.35)',
        glow: '0 18px 40px -16px rgba(249, 115, 22, 0.55)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 500ms ease-out both',
        float: 'float 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
