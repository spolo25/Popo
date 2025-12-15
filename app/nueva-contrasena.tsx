'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from './lib/supabaseClient'

export default function NuevaContrasenaPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Capturamos el token del URL
  const token = searchParams.get('access_token')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      setMessage('Por favor completa ambos campos')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden')
      return
    }

    if (!token) {
      setMessage('Token no válido o expirado')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password,
      // token se pasa en el header de autorización automáticamente con supabase-js
    })

    setLoading(false)

    if (error) {
      setMessage('Error al actualizar la contraseña: ' + error.message)
    } else {
      setMessage('¡Contraseña actualizada exitosamente!')
      setTimeout(() => {
        router.push('/login') // redirige al login
      }, 2000)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '50px auto', textAlign: 'center' }}>
      <h2>Restablecer contraseña</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: 'block', margin: '10px 0', width: '100%', padding: '8px' }}
        />
        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{ display: 'block', margin: '10px 0', width: '100%', padding: '8px' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>
          {loading ? 'Actualizando...' : 'Cambiar contraseña'}
        </button>
      </form>
      {message && <p style={{ marginTop: 10 }}>{message}</p>}
    </div>
  )
}
