/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jctsl: {
          teal: '#1D9E75',
          light: '#E5F6F0',
        },
        jmrc: {
          blue: '#185FA5',
          light: '#E8F0F7',
        },
        ipt: {
          amber: '#F2A900',
          light: '#FEF6E5',
        },
        coral: {
          private: '#FF5A5F',
          light: '#FFEBEB',
        },
        heritage: {
          pink: '#E07A5F',
        },
        glass: {
          bg: 'rgba(15, 23, 42, 0.45)',
          border: 'rgba(255, 255, 255, 0.08)',
          highlight: 'rgba(255, 255, 255, 0.15)',
        }
      },
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        devanagari: ['Noto Sans Devanagari', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      }
    },
  },
  plugins: [],
}
