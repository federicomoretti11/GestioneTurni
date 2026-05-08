import { redirect } from 'next/navigation'
import { isDocumentiAbilitato } from '@/lib/impostazioni'

export default async function DocumentiLayout({ children }: { children: React.ReactNode }) {
  if (!await isDocumentiAbilitato()) redirect('/home')
  return <>{children}</>
}
