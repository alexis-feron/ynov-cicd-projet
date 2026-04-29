import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      maxWidth: {
        prose: '860px',
      },
      gridTemplateColumns: {
        dashboard: '1fr 1.4fr',
      },
    },
  },
  plugins: [],
};

export default config;
