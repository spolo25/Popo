'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export default function ResetPasswordPage() {
  const search = useSearchParams()
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const accessToken = search.get('access_token') || search.get('token') || ''
  const refreshToken = search.get('refresh_token') || ''

  useEffect(() => {
    const activateSession = async () => {
      if (!accessToken) {
        setMessage('Token no encontrado en la URL.')
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
  }, [accessToken, refreshToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || password.length < 6) {
      setMessage('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setMessage('Error al guardar contraseña: ' + error.message)
      return
    }

    setMessage('Contraseña actualizada correctamente. Redirigiendo al login...')
    setTimeout(() => router.push('/'), 2000)
  }

  return (
    <div
      className="position-relative min-vh-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundImage: "url('/images/trago.jpeg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Capa oscura */}
      <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-50"></div>

      {/* Contenedor principal */}
      <div className="position-relative z-index-1 container">
        <div className="row justify-content-center align-items-center min-vh-100">
          <div className="col-md-5">
            <div className="card bg-white bg-opacity-25 backdrop-blur p-4 p-md-5 border border-white border-opacity-25 shadow-lg">
              <h2 className="text-white text-center mb-4">Restablecer contraseña</h2>

              {message && (
                <p className="text-center text-white-75 mb-3">{message}</p>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-control"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-warning w-100 fw-semibold"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar contraseña'}
                </button>
              </form>

              <div className="text-center mt-3">
                <a href="/" className="text-warning text-decoration-underline">
                  Volver al login
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
