import Link from 'next/link'
import React from 'react'
import { Header } from '@/components/layout/Header'
import { ROUTES } from '@/utils/constants'

interface LegalPageProps {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

/** Shared chrome for the privacy policy and terms — reachable without a session. */
export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated {lastUpdated}</p>

        <div className="mt-8 space-y-8 text-gray-700 [&_a]:font-medium [&_a]:text-blue-600 [&_a:hover]:underline [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:space-y-2">
          {children}
        </div>

        <nav aria-label="Legal" className="mt-12 flex gap-6 border-t border-gray-200 pt-6 text-sm">
          <Link href={ROUTES.HOME} className="font-medium text-blue-600 hover:underline">
            Home
          </Link>
          <Link href={ROUTES.PRIVACY} className="font-medium text-blue-600 hover:underline">
            Privacy
          </Link>
          <Link href={ROUTES.TERMS} className="font-medium text-blue-600 hover:underline">
            Terms
          </Link>
        </nav>
      </main>
    </div>
  )
}
