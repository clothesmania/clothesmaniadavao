const theme = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        display: ['Inter', 'sans-serif'],
                    },
                    colors: {
                        background: 'hsl(var(--background) / <alpha-value>)',
                        foreground: 'hsl(var(--foreground) / <alpha-value>)',
                        card: 'hsl(var(--card) / <alpha-value>)',
                        border: 'hsl(var(--border) / <alpha-value>)',
                        input: 'hsl(var(--input) / <alpha-value>)',
                        ring: 'hsl(var(--ring) / <alpha-value>)',
                        muted: 'hsl(var(--muted) / <alpha-value>)',
                        'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
                        primary: 'hsl(var(--primary) / <alpha-value>)',
                        'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',
                        destructive: 'hsl(var(--destructive) / <alpha-value>)',
                        brand: {
                            50: '#fffbeb',
                            100: '#fef3c7',
                            500: '#f59e0b',
                            600: '#d97706',
                            700: '#b45309',
                            900: '#78350f',
                        }
                    }
                }
            }
        };
module.exports = { ...theme, content: ['./src/pos/**/*.html', './public/pos-runtime.js', './public/report-io.js', './app/**/*.{js,jsx}'] };
