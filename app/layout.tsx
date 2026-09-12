import type { Metadata } from 'next'
import { AuthSessionProvider } from '@/components/providers/SessionProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { APP_DESCRIPTION, APP_NAME } from '@/utils/constants'
import './globals.css'

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Browser extensions inject attributes here before React hydrates. */}
      <body suppressHydrationWarning>
        <AuthSessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
