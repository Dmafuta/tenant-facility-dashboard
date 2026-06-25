import { cookies } from 'next/headers'
import { getSubjectFromSession } from '@/lib/auth/session'
import CasualPayrollClient from './CasualPayrollClient'

export default async function PayrollPage() {
  await getSubjectFromSession()
  return <CasualPayrollClient />
}
