'use client'
import Link from 'next/link'

export default function TermsAndConditions() {
  return (
    <div style={{ fontFamily: 'system-ui,sans-serif', background: '#080c14', minHeight: '100vh', color: '#f1f5f9' }}>
      <nav style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '20px', fontWeight: 800, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f1f5f9' }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
        </Link>
        <Link href="/" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }}>Back to home</Link>
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Terms & Conditions</h1>
        <p style={{ color: '#64748b', marginBottom: '40px' }}>Last updated: June 2026</p>

        {[
          {
            title: '1. About feedme.gg',
            content: `feedme.gg is an online food ordering platform based in Guernsey. We act as an intermediary between customers and restaurants. By using feedme.gg, you agree to these terms.`
          },
          {
            title: '2. Placing orders',
            content: `When you place an order through feedme.gg:\n\n• Your order is a contract between you and the restaurant\n• feedme.gg is not a party to that contract\n• The restaurant is responsible for preparing and delivering your food\n• Prices shown are set by the restaurant and include VAT where applicable\n• You must be 18 or over to order alcohol where applicable`
          },
          {
            title: '3. Payment',
            content: `Card payments are processed securely by SumUp. feedme.gg does not store your card details.\n\nFor card orders, payment is taken when the restaurant accepts your order.\n\nFor cash orders, payment is made directly to the restaurant on delivery or collection.`
          },
          {
            title: '4. Cancellations & refunds',
            content: `Once a restaurant has accepted your order, cancellation may not be possible.\n\nIf your order is rejected by the restaurant, no payment will be taken for card orders.\n\nFor issues with your order (wrong items, missing items, quality issues), contact the restaurant directly in the first instance. If you cannot resolve it, email feedme.gg@mail.com and we will do our best to assist.`
          },
          {
            title: '5. Delivery',
            content: `Delivery times shown are estimates only. Actual delivery times may vary due to distance, traffic, weather and restaurant preparation time.\n\nfeedme.gg and the restaurant are not liable for delays outside their reasonable control.`
          },
          {
            title: '6. Restaurant responsibilities',
            content: `Restaurants listed on feedme.gg are responsible for:\n\n• The accuracy of their menu and pricing\n• Food hygiene and safety standards\n• Allergen information\n• Fulfilling orders in a timely manner\n\nfeedme.gg does not guarantee the quality or safety of food prepared by restaurants.`
          },
          {
            title: '7. Allergens',
            content: `If you have a food allergy or intolerance, please contact the restaurant directly before ordering. feedme.gg cannot guarantee that any item is free from allergens.`
          },
          {
            title: '8. User accounts',
            content: `You are responsible for keeping your account credentials secure. You must not share your account with others. You must be 16 or over to create an account.\n\nWe reserve the right to suspend or terminate accounts that misuse the platform.`
          },
          {
            title: '9. Acceptable use',
            content: `You must not:\n\n• Place fraudulent orders\n• Abuse or harass restaurant staff\n• Use the platform for any unlawful purpose\n• Attempt to circumvent our payment systems`
          },
          {
            title: '10. Limitation of liability',
            content: `feedme.gg is not liable for:\n\n• The actions or omissions of restaurants\n• Food quality or safety issues\n• Delays in delivery\n• Loss of earnings or indirect losses\n\nOur total liability to you shall not exceed the value of the order in question.`
          },
          {
            title: '11. Governing law',
            content: `These terms are governed by the laws of the Bailiwick of Guernsey.`
          },
          {
            title: '12. Contact',
            content: `feedme.gg\nGuernsey, Channel Islands\nfeedme.gg@mail.com`
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
        <Link href="/cookies" style={{ color: '#64748b', textDecoration: 'none' }}>Cookie Policy</Link>
      </footer>
    </div>
  )
}
