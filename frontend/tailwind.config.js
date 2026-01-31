/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#D1F366', // The Lime Green Accent
                'primary-hover': '#bde049',
                dark: {
                    900: '#000000', // Main background
                    800: '#121212', // Sidebar / Secondary background
                    700: '#1A1A1A', // Cards
                    600: '#2A2A2A', // Borders
                    500: '#555555', // Muted Text
                    400: '#888888', // Secondary Text
                    300: '#B0B0B0', // Light Gray Text
                    200: '#D1D1D1', // Off-White Text
                    100: '#E5E5E5', // Almost White
                },
                success: '#10b981',
                danger: '#ef4444',
                warning: '#f59e0b',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
