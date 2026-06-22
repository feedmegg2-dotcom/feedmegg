'use client'
import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <div style={{ fontFamily: 'system-ui,sans-serif', background: '#080c14', minHeight: '100vh', color: '#f1f5f9' }}>
      <nav style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '20px', fontWeight: 800, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f1f5f9' }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
        </Link>
        <Link href="/" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }}>Back to home</Link>
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Privacy Policy</h1>
        <p style={{ color: '#64748b', marginBottom: '40px' }}>Last updated: June 2026</p>

        {[
          {
            title: '1. Who we are',
            content: `feedme.gg is a food ordering platform based in Guernsey, Channel Islands. We operate the website at feedme.gg and facilitate online food orders between customers and local restaurants.\n\nContact: feedme.gg@mail.com`
          },
          {
            title: '2. What data we collect',
            content: `We collect the following information when you use feedme.gg:\n\n• Name and contact details (name, phone number, email address)\n• Delivery address\n• Order history and preferences\n• Payment information (processed securely by SumUp - we do not store card details)\n• Device information and browser type\n• IP address and usage data`
          },
          {
            title: '3. Why we collect it',
            content: `We use your data to:\n\n• Process and deliver your food orders\n• Send order confirmation emails\n• Allow you to view your order history\n• Improve our service\n• Comply with legal obligations\n\nWe do not sell your data to third parties.`
          },
          {
            title: '4. Who we share it with',
            content: `We share your data only as necessary:\n\n• Restaurants - to fulfil your order (name, phone, delivery address)\n• SumUp - to process card payments\n• Resend - to send confirmation emails\n• Supabase - our database provider (data stored in EU)\n• Vercel - our hosting provider`
          },
          {
            title: '5. How long we keep it',
            content: `We keep your personal data for as long as your account is active. Order history is kept for up to 3 years for accounting purposes. You can request deletion of your account and data at any time by emailing feedme.gg@mail.com.`
          },
          {
            title: '6. Your rights',
            content: `Under Guernsey data protection law (based on GDPR principles) you have the right to:\n\n• Access your personal data\n• Correct inaccurate data\n• Request deletion of your data\n• Object to processing\n• Data portability\n\nTo exercise any of these rights, email feedme.gg@mail.com.`
          },
          {
            title: '7. Cookies',
            content: `We use essential cookies to keep you logged in and remember your cart. We also use anonymous analytics to understand how people use our site. See our Cookie Policy for full details.`
          },
          {
            title: '8. Security',
            content: `We take security seriously. All data is encrypted in transit (HTTPS). Payment processing is handled by SumUp who are PCI DSS compliant. We never store your card details.`
          },
          {
            title: '9. Changes',
            content: `We may update this policy from time to time. We will notify you of significant changes by email or by displaying a notice on the site.`
          },
          {
            title: '10. Contact',
            content: `For any privacy questions or requests:\n\nfeedme.gg\nGuernsey, Channel Islands\nfeedme.gg@mail.com`
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: '#22c55e' }}>{section.title}</h2>
            <div style={{ color: '#94a3b8', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{section.content}</div>
          </div>
        ))}
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>
        <Link href="/terms" style={{ color: '#64748b', textDecoration: 'none', marginRight: '16px' }}>Terms & Conditions</Link>
        <Link href="/cookies" style={{ color: '#64748b', textDecoration: 'none' }}>Cookie Policy</Link>
      </footer>
    </div>
  )
}
