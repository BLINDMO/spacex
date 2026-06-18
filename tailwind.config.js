/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mission-ops palette: near-black background, single cyan accent + status colors
        panel: '#0a0d10',
        panel2: '#0f1418',
        panel3: '#141b21',
        grid: '#1c2630',
        edge: '#2a3742',
        ink: '#c7d2da',
        dim: '#6b7c88',
        accent: '#39c0d6',
        amber: '#e0a020',
        go: '#35c66b',
        warn: '#e0a020',
        nogo: '#e0483a',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
