'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg(error.message)
    else router.push('/ventas')
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
      {/* Capa oscura */}
      <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-50"></div>

      {/* Contenedor principal */}
      <div className="position-relative z-index-1 container">
        <div className="row justify-content-center align-items-center min-vh-100">
          
          {/* IZQUIERDA - Info */}
          <div className="col-md-6 text-center text-md-start text-white mb-5 mb-md-0">
            <h1 className="display-4 fw-bold mb-4">Bienvenido</h1>
            <p className="lead mb-4">
              Licoreria Popo
            </p>
            <div className="d-flex justify-content-center justify-content-md-start gap-3 fs-3 opacity-75">
              <i className="fab fa-facebook hover-opacity"></i>
              <i className="fab fa-twitter hover-opacity"></i>
              <i className="fab fa-instagram hover-opacity"></i>
              <i className="fab fa-youtube hover-opacity"></i>
            </div>
          </div>

          {/* DERECHA - Formulario */}
          <div className="col-md-5">
            <div className="card bg-white bg-opacity-25 backdrop-blur p-4 p-md-5 border border-white border-opacity-25 shadow-lg">
              <h2 className="text-white text-center mb-4">Iniciar Sesion</h2>

              <div className="mb-3">
                <label className="form-label text-white">Correo</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control"
                  placeholder="Correo"
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-white">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-control"
                  placeholder="Contraseña"
                />
              </div>

              

              <button
                onClick={login}
                className="btn btn-warning w-100 fw-semibold mb-3"
              >
                Ingresar ahora
              </button>

              <div className="text-center mb-3">
                <a href="/forgot-password" className="text-warning text-decoration-underline">
                  Olvidaste tu contraseña?
                </a>
              </div>

              {msg && (
                <p className="text-danger text-center">{msg}</p>
              )}

              <p className="text-white-75 text-center small mt-3">
                Al dar click aceptas a nuestros{" "}
                <a className="text-warning text-decoration-underline">Terminos y condiciones</a> |{" "}
                <a className="text-warning text-decoration-underline">Politica de privacidad</a>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
