import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './globals.css'
import './pos.css'

export const metadata = {
  title: 'Clothes Mania Davao - Inventory & Sales Management System',
  description: 'Clothes Mania Davao inventory, live-selling orders, and encrypted workspace sync.',
  icons: { icon: '/images/favicon.png', apple: '/images/favicon.png' },
  manifest: '/manifest.webmanifest'
}

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#f59e0b' }

export default function RootLayout({ children }) {
  return <html lang="en" className="light" suppressHydrationWarning>
    <body className="bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 min-h-screen flex antialiased transition-colors duration-300">
      {children}
    </body>
  </html>
}
