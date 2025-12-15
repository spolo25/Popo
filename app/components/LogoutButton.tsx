'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export default function LogoutButton() {
  const router = useRouter()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/') // vuelve al login
  }

  return (
    <button onClick={handleLogout} className="btn-logout">
      Cerrar sesión
    </button>
  )
}
