import nodemailer from 'nodemailer'

export async function enviarInvitacion(email: string, link: string) {
  // Configuración del SMTP
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',       // tu host SMTP
    port: 587 ,                 // puerto SMTP seguro
    secure: false,                 // true porque usamos 465
    auth: {
      user: process.env.SMTP_USER,      // tu correo, por ejemplo pololopezsebastian.25@gmail.com
      pass: process.env.SMTP_PASS,      // contraseña de app de Gmail
    },
  })

  // Contenido del correo
  const mailOptions = {
    from: `"Licorería App" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Invitación a Licorería App',
    html: `
      <p>Hola 👋</p>
      <p>Te hemos invitado a Licorería App. Para completar tu registro haz clic en el siguiente enlace:</p>
      <a href="${link}">Completar registro</a>
      <p>Este enlace es temporal y solo válido para tu registro.</p>
    `,
  }

  // Enviar correo
  const info = await transporter.sendMail(mailOptions)
  console.log('Mensaje enviado:', info.messageId)
}
