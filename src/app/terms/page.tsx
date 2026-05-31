// Terms & Conditions Page
'use client'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <nav style={{ background: 'rgba(15,23,42,0.97)', borderBottom: '1px solid var(--border)', padding: '0 20px', height: '60px', display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ fontFamily: 'Syne', fontSize: '22px', fontWeight: 800, letterSpacing: '-1px', textDecoration: 'none' }}>
          <span style={{ color: 'var(--green)' }}>feed</span><span style={{ color: 'var(--text)' }}>me.gg</span>
        </Link>
      </nav>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 20px' }}>
        <Link href="/" className="btn-ghost" style={{ marginBottom: '24px', display: 'inline-block' }}>← Back</Link>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Terms & Conditions</h1>
        <p style={{ fontSize: '13px', color: 'var(--sub)', marginBottom: '32px' }}>Last updated: January 2026</p>
        {[
          { title: '1. About feedme.gg', content: 'feedme.gg is a food ordering platform based in Guernsey that connects customers with local restaurants. We facilitate orders but do not prepare or deliver food ourselves.' },
          { title: '2. Allergen Information', content: 'Allergen information provided on this platform is AI-assisted and is provided as a guide only. Customers with food allergies or intolerances must contact the restaurant directly to verify allergen information before ordering. feedme.gg accepts no liability for allergic reactions resulting from orders placed through this platform.' },
          { title: '3. Age Verification for Alcohol', content: 'Restaurants are solely responsible for verifying customer age at the point of delivery or collection for orders containing alcohol. feedme.gg accepts no liability in this regard.' },
          { title: '4. Orders & Cancellations', content: 'Orders cannot be cancelled by the customer once placed. All refund requests must be directed to the individual restaurant. Refunds are at the sole discretion of the restaurant.' },
          { title: '5. Payments', content: 'All payments are processed securely through SumUp. Payment links expire 2 minutes after generation. feedme.gg processes payments on behalf of merchants using their own SumUp accounts.' },
          { title: '6. Calorie Information', content: 'Calorie estimates displayed on menu items are AI-generated approximations only. Actual calorie content may vary significantly. feedme.gg makes no warranty as to the accuracy of calorie information.' },
          { title: '7. Limitation of Liability', content: 'feedme.gg acts as an intermediary platform. We are not liable for the quality, safety, or legality of food prepared by restaurants, delivery delays, or disputes between customers and restaurants.' },
          { title: '8. Data & Privacy', content: 'Your use of feedme.gg is subject to our Privacy Policy. We collect and process personal data in accordance with GDPR.' },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{section.title}</h2>
            <p style={{ fontSize: '14px', color: 'var(--sub)', lineHeight: 1.7 }}>{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
