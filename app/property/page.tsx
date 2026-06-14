import { getUnits } from '@/lib/supabase/queries'
import PropertyPageClient from './PropertyPageClient'

export default async function PropertyPage() {
  const units = await getUnits()
  return <PropertyPageClient initialUnits={units} />
}
