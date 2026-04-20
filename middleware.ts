import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Non autenticato → redirect al login
  if (!user && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('ruolo')
      .eq('id', user.id)
      .single()

    const ruolo = profile?.ruolo

    // Redirect dalla root/login alla dashboard corretta
    if (path === '/' || path === '/login') {
      if (ruolo === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      if (ruolo === 'manager') return NextResponse.redirect(new URL('/manager/calendario', request.url))
      if (ruolo === 'dipendente') return NextResponse.redirect(new URL('/dipendente/turni', request.url))
    }

    // Protezione route per ruolo
    if (path.startsWith('/admin') && ruolo !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (path.startsWith('/manager') && ruolo !== 'manager') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (path.startsWith('/dipendente') && ruolo !== 'dipendente') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
