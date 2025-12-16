import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // ✅ RUTAS PÚBLICAS (NO TOCAR)
  if (
    pathname === '/' ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/forgot-password')
  ) {
    return res
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          res.cookies.delete({ name, ...options })
        }
      }
    }
  )

  const { data } = await supabase.auth.getUser()

  // 🔒 PROTECCIÓN SOLO PARA /ventas
  if (pathname.startsWith('/ventas') && !data.user) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: [
    /*
      Aplica middleware a todo EXCEPTO archivos estáticos
    */
    '/((?!_next|favicon.ico|images).*)'
  ]
}
