import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { supabase } from '@/app/lib/supabaseClient'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }

  // 🔥 Dominio dinámico: local + producción (Vercel)
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // 🔥 Generar link de recuperación con redirect
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${baseUrl}/nueva-contrasena`
    }
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const link = data.properties?.action_link

  // 📩 Configuración de nodemailer (gmail app password)
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })

  await transporter.sendMail({
    from: `"Licorería App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Recuperación de contraseña',
    html: `
      <p>Haga clic en el siguiente enlace para recuperar su contraseña:</p>
      <p><a href="${link}" target="_blank">${link}</a></p>
    `
  })

  return NextResponse.json({ message: 'Correo enviado correctamente' })
}
