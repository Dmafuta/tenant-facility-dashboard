import { redirect } from 'next/navigation'
import { getSubjectFromSession } from '@/lib/auth/session'
import { ROLE_HOME } from '@/lib/nav-config'

export default async function HomePage() {
  const subject = await getSubjectFromSession()
  redirect(ROLE_HOME[subject.role] ?? '/dashboard')
}
