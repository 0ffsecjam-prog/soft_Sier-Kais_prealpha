import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff8ff',
          100: '#dbeefe',
          200: '#bfe1fe',
          300: '#93cefd',
          400: '#60b1fa',
          500: '#3b91f5',
          600: '#2573ea',
          700: '#1d5dd7',
          800: '#1f4cae',
          900: '#1f4389',
          950: '#172a54',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
