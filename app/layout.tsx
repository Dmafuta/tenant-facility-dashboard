import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { getSubjectFromSession } from '@/lib/auth/session'

export const metadata: Metadata = {
  title: 'Tenant Portal',
  description: 'Facility management portal',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const subject = await getSubjectFromSession()
  return (
    <html lang="en">
      <body>
        <Providers subject={subject}>
          {children}
        </Providers>
      </body>
    </html>
  )
}
