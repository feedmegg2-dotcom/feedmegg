import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'feedme.gg Terminal',
  manifest: '/manifest-terminal.json',
}

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
