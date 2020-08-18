module.exports = {
  purge: [
    './src/**/*.html',
  ],
  theme: {
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
