'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import TicketEditor from '@/components/TicketEditor'

export default function TicketsPage() {
  const params = useParams()
  const restaurantId = params.restaurantId as string
  const router = useRouter()

  return (
    <div>
      <div style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => router.push('/merchant/dashboard')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>← Back</button>
        <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '16px' }}>Ticket Editor</span>
      </div>
      <TicketEditor restaurantId={restaurantId} />
    </div>
  )
}
