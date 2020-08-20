module.exports = {
  purge: [
    './src/**/*.html',
  ],
  theme: {
    fontFamily: {
      sans: 'Open sans',
      serif: 'Roboto Slab'
    },
    screens: {
      'sm': '400px',
      'md': '640px',
      'lg': '768px',
      'xl': '1024px',
    },
  },
  variants: {},
  plugins: [
    require('@tailwindcss/custom-forms'),
  ],
}
