'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)

  const enviarCorreo = async () => {
    if (!email) {
      setMensaje('Ingresa un correo válido.')
      return
    }

    setLoading(true)

    // ✅ URL dinámica (local o producción)
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : ''

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    })

    setLoading(false)

    if (error) {
      setMensaje(error.message)
    } else {
      setMensaje('Revisa tu correo para continuar con la recuperación.')
    }
  }

  return (
    <div
      className="position-relative min-vh-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundImage: "url('/images/trago.jpeg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-50"></div>

      <div className="position-relative container z-1">
        <div className="row justify-content-center">
          <div className="col-md-5 col-lg-4">

            <div className="card bg-white bg-opacity-25 backdrop-blur p-4 border border-white border-opacity-25 shadow-lg">
              <h2 className="text-white text-center mb-3 fw-bold">
                Recuperar contraseña
              </h2>

              <p className="text-white-75 text-center small mb-4">
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
              </p>

              <div className="mb-3">
                <label className="form-label text-white">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control"
                  placeholder="Correo"
                />
              </div>

              <button
                onClick={enviarCorreo}
                disabled={loading}
                className="btn btn-warning w-100 fw-semibold mb-3"
              >
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>

              {mensaje && (
                <p className="text-center text-white-75 small">
                  {mensaje}
                </p>
              )}

              <div className="text-center mt-3">
                <a
                  href="/"
                  className="text-warning text-decoration-underline small"
                >
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
