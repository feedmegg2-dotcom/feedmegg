'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { TicketEditor } from '@/components/TicketEditor'

export default function TicketsPage() {
  const params = useParams()
  const router = useRouter()
  const restaurantId = params.restaurantId as string
  const supabase = createClient()
  const [restaurantName, setRestaurantName] = useState('Restaurant')

  useEffect(() => {
    supabase.from('restaurants').select('name').eq('id', restaurantId).single()
      .then(({ data }) => { if (data) setRestaurantName(data.name) })
  }, [restaurantId])

  return (
    <TicketEditor
      restaurantId={restaurantId}
      restaurantName={restaurantName}
      onClose={() => router.push('/merchant/dashboard')}
    />
  )
}
