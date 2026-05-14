import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// Resolve tenant_id from subdomain; edge-compatible (no 'server-only' import)
async function resolveTenantId(host: string): Promise<string | null> {
  // Sviluppo locale: usa variabile env
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return process.env.NEXT_PUBLIC_DEV_TENANT_ID ?? null
  }

  const slug = host.split('.')[0]
  if (!slug || slug === 'www') return process.env.NEXT_PUBLIC_DEV_TENANT_ID ?? null

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data } = await admin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .eq('attivo', true)
    .single()

  // Fallback per URL Vercel preview (es. gestione-turni.vercel.app) senza dominio custom
  return data?.id ?? process.env.NEXT_PUBLIC_DEV_TENANT_ID ?? null
}

function isRootDomain(host: string): boolean {
  return (
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host === 'operohub.com' ||
    host === 'www.operohub.com'
  )
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const path = request.nextUrl.pathname

  // Risolvi tenant per tutte le route (incluse API)
  const tenantId = await resolveTenantId(host)

  // API routes: imposta X-Tenant-Id e passa
  if (path.startsWith('/api/')) {
    const requestHeaders = new Headers(request.headers)
    if (tenantId) requestHeaders.set('X-Tenant-Id', tenantId)
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    return res
  }

  // Tenant non trovato per route UI → 404
  if (!tenantId && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return new NextResponse('Azienda non trovata', { status: 404 })
  }

  // Auth middleware (pagine UI)
  const requestHeaders = new Headers(request.headers)
  if (tenantId) requestHeaders.set('X-Tenant-Id', tenantId)

  let response = NextResponse.next({ request: { headers: requestHeaders } })

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

  const pubbliche = ['/login', '/reset-password', '/auth/callback', '/privacy', '/cookie-policy']
  const isLandingRoot = path === '/' && isRootDomain(host)

  if (!user && !pubbliche.includes(path) && !isLandingRoot) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('ruolo, is_super_admin')
      .eq('id', user.id)
      .single()

    const ruolo = profile?.ruolo
    const isSuperAdmin = profile?.is_super_admin === true

    if (path === '/' || path === '/login') {
      return NextResponse.redirect(new URL('/home', request.url))
    }

    if (path.startsWith('/super-admin') && !isSuperAdmin) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    if (path.startsWith('/admin') && ruolo !== 'admin' && !isSuperAdmin) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (path.startsWith('/manager') && ruolo !== 'manager' && ruolo !== 'admin' && !isSuperAdmin) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (path.startsWith('/dipendente') && ruolo !== 'dipendente' && ruolo !== 'admin' && !isSuperAdmin) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)).*)'],
}
