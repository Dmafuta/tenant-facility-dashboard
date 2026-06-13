import { getSubjectFromSession } from '@/lib/auth/session'
import DashboardPageClient from './DashboardPageClient'
export default async function DashboardPage() {
  await getSubjectFromSession()
  return <DashboardPageClient />
}
