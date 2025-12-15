'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [mensaje, setMensaje] = useState('')

  const enviarCorreo = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/reset-password'
    })

    if (error) setMensaje(error.message)
    else setMensaje('Revisa tu correo para continuar con la recuperación.')
  }

  return (
    <div style={{ maxWidth: 400, margin: '50px auto' }}>
      <h2>Recuperar contraseña</h2>

      <input
        type="email"
        placeholder="Tu correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input"
      />

      <button onClick={enviarCorreo} className="btn">
        Enviar enlace
      </button>

      {mensaje && <p>{mensaje}</p>}
    </div>
  )
}
