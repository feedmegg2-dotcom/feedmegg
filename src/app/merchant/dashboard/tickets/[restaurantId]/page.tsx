'use client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function TicketsPage() {
  const params = useParams()
  const router = useRouter()
  const restaurantId = params.restaurantId

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'system-ui,sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => router.push('/merchant/dashboard')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>← Back</button>
          <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Ticket Templates</h1>
        </div>
        <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎫</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Ticket Editor</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Customise your kitchen, customer and delivery tickets</p>
          <Link href={`/merchant/dashboard/tickets/${restaurantId}/editor`} style={{ display: 'inline-block', padding: '12px 28px', background: '#22c55e', color: '#080c14', borderRadius: '10px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
            Open Ticket Editor
          </Link>
        </div>
      </div>
    </div>
  )
}
