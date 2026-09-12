import type { Metadata } from 'next'
import { APP_NAME, APP_DESCRIPTION } from '@/utils/constants'
import { AuthSessionProvider } from '@/components/providers/SessionProvider'
import './globals.css'

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthSessionProvider>
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  )
}
