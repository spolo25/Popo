import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css' // para tus estilos personalizados

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* ICONOS FONTAWESOME */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
      </head>

      <body>
        {children}
      </body>
    </html>
  )
}
