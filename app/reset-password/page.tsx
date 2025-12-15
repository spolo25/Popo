'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const activateSession = async () => {
      // 🔥 LEER EL HASH (#)
      const hash = window.location.hash.replace('#', '')
      const params = new URLSearchParams(hash)

      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (!accessToken || !refreshToken) {
        setMessage('Token no encontrado o enlace inválido.')
        return
      }

      setLoading(true)

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      setLoading(false)

      if (error) {
        setMessage('Token inválido o expirado.')
        return
      }

      setMessage('Token válido. Ingresa tu nueva contraseña.')
    }

    activateSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      setMessage('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setMessage('Error al actualizar contraseña.')
      return
    }

    setMessage('Contraseña actualizada correctamente. Redirigiendo...')
    setTimeout(() => router.push('/'), 2000)
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark">
      <div className="card p-4" style={{ maxWidth: 400, width: '100%' }}>
        <h4 className="text-center mb-3">Restablecer contraseña</h4>

        {message && <p className="text-center">{message}</p>}

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className="form-control mb-3"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="btn btn-warning w-100" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
