import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'feedme.gg — Guernsey Food Delivery',
    template: '%s | feedme.gg',
  },
  description: 'Order food from the best local restaurants in Guernsey. Fast delivery or collection, fresh food made to order.',
  keywords: ['food delivery Guernsey', 'takeaway Guernsey', 'order food online Guernsey', 'feedme.gg'],
  authors: [{ name: 'feedme.gg' }],
  creator: 'feedme.gg',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://feedme.gg',
    title: 'feedme.gg — Guernsey Food Delivery',
    description: 'Order food from the best local restaurants in Guernsey.',
    siteName: 'feedme.gg',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'feedme.gg — Guernsey Food Delivery',
    description: 'Order food from the best local restaurants in Guernsey.',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#22C55E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className} style={{ background: '#0F172A', color: '#F8FAFC', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
