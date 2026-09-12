'use client'

import React from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'

interface AppShellProps {
  title: string
  /** Controls rendered to the right of the page title. */
  actions?: React.ReactNode
  children: React.ReactNode
}

/** Header + sidebar chrome shared by every signed-in screen. */
export function AppShell({ title, actions, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 lg:mb-8">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
              {actions}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
