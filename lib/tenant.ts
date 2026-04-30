import 'server-only'
import { headers } from 'next/headers'

export function getTenantId(): string | null {
  return headers().get('X-Tenant-Id')
}

export function requireTenantId(): string {
  const id = getTenantId()
  if (!id) throw new Error('Tenant non risolto — X-Tenant-Id header mancante')
  return id
}
