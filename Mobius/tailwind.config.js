/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stitch / MD3 inspired custom colors
        stitch: {
          dark: '#121212',
          surface: '#1e1e1e',
          card: '#292929',
          border: '#3f3f3f',
          text: '#e3e3e3',
          muted: '#9e9e9e',
          accent: '#8ab4f8', // MD3 standard active blue
          // Transport state indicators
          idle: '#9e9e9e',
          armed: '#8ab4f8',      // Blue
          recording: '#f28b82',  // Red
          playing: '#81c995',    // Green
          overdubbing: '#fdd663',// Amber/Yellow
          paused: '#fdd663'      // Amber/Yellow
        }
      }
    },
  },
  plugins: [],
}
