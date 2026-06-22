'use client'
import Link from 'next/link'

export default function CookiePolicy() {
  return (
    <div style={{ fontFamily: 'system-ui,sans-serif', background: '#080c14', minHeight: '100vh', color: '#f1f5f9' }}>
      <nav style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '20px', fontWeight: 800, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f1f5f9' }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
        </Link>
        <Link href="/" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }}>Back to home</Link>
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Cookie Policy</h1>
        <p style={{ color: '#64748b', marginBottom: '40px' }}>Last updated: June 2026</p>

        {[
          {
            title: 'What are cookies?',
            content: `Cookies are small text files stored on your device when you visit a website. They help websites remember information about your visit.`
          },
          {
            title: 'Essential cookies',
            content: `These cookies are necessary for feedme.gg to work and cannot be switched off.\n\n• Authentication - keeps you logged in to your account\n• Cart - remembers items in your basket\n• Theme preference - remembers your light/dark mode setting\n• Session - maintains your session securely\n\nThese cookies do not track you across other websites.`
          },
          {
            title: 'Analytics cookies',
            content: `We use anonymous analytics to understand how visitors use our site. This helps us improve feedme.gg.\n\n• We do not use Google Analytics\n• No personally identifiable information is collected\n• Data is aggregated and anonymous`
          },
          {
            title: 'Third party cookies',
            content: `Some features of feedme.gg use third party services which may set their own cookies:\n\n• SumUp - payment processing\n• Supabase - authentication and data storage\n• Vercel - hosting and performance\n\nThese services have their own privacy policies.`
          },
          {
            title: 'Managing cookies',
            content: `You can control cookies through your browser settings. Disabling essential cookies may prevent feedme.gg from working correctly.\n\nMost browsers allow you to:\n• View what cookies are stored\n• Delete individual cookies\n• Block all or certain cookies\n\nFor more information, visit your browser's help section.`
          },
          {
            title: 'Contact',
            content: `If you have questions about our use of cookies:\n\nfeedme.gg@mail.com`
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: '#22c55e' }}>{section.title}</h2>
            <div style={{ color: '#94a3b8', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{section.content}</div>
          </div>
        ))}
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>
        <Link href="/privacy" style={{ color: '#64748b', textDecoration: 'none', marginRight: '16px' }}>Privacy Policy</Link>
        <Link href="/terms" style={{ color: '#64748b', textDecoration: 'none' }}>Terms & Conditions</Link>
      </footer>
    </div>
  )
}
