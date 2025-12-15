import { supabase } from './supabaseClient'
import { enviarInvitacion } from './email'

export async function invitarUsuario(email: string) {
  try {
    // Generar link de signup
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      password: 'Temporal123!',
    })

    if (error) throw error

    const link = data.properties?.action_link
    if (!link) throw new Error('No se pudo generar el link de invitación')

    // Enviar el link por correo
    await enviarInvitacion(email, link)
    console.log('Invitación enviada a', email)
  } catch (err) {
    console.error('Error invitando usuario:', err)
  }
  
}
export async function enviarLinkReset(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail('usuario@gmail.com', {
  redirectTo: 'https://licoreria-app.vercel.app/nueva-contrasena'
})


  if (error) {
    console.error('Error enviando link de reset:', error.message)
    return
  }

  console.log('Link de recuperación enviado a', email)
  console.log(data) // contiene info sobre el email enviado
}