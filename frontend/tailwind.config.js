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
                    800: '#151515', // Sidebar / Secondary background
                    700: '#1E1E1E', // Cards
                    600: '#2C2C2C', // Borders
                    500: '#888888', // Secondary Text
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
