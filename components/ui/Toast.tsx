'use client'

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void | Promise<void>
}

export interface ToastInput {
  title: string
  description?: string
  variant?: ToastVariant
  action?: ToastAction
  /** Milliseconds on screen. Pass 0 to require a manual dismiss. */
  durationMs?: number
}

interface ToastRecord extends ToastInput {
  id: number
}

interface ToastContextValue {
  toast: (input: ToastInput) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_DURATION_MS = 5_000

const STYLES: Record<ToastVariant, { icon: typeof Info; accent: string }> = {
  success: { icon: CheckCircle2, accent: 'text-green-600' },
  error: { icon: AlertCircle, accent: 'text-red-600' },
  info: { icon: Info, accent: 'text-blue-600' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++
      setToasts((current) => [...current, { ...input, id }])

      const duration = input.durationMs ?? DEFAULT_DURATION_MS
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        )
      }

      return id
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        role="status"
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-6 sm:w-96"
      >
        {toasts.map((item) => {
          const { icon: Icon, accent } = STYLES[item.variant ?? 'info']

          return (
            <div
              key={item.id}
              className="pointer-events-auto flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
            >
              <Icon aria-hidden="true" className={cn('mt-0.5 h-5 w-5 flex-none', accent)} />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 break-words text-sm text-gray-600">{item.description}</p>
                ) : null}

                {item.action ? (
                  <button
                    type="button"
                    onClick={() => {
                      void item.action?.onClick()
                      dismiss(item.id)
                    }}
                    className="mt-2 rounded text-sm font-medium text-blue-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {item.action.label}
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label={`Dismiss: ${item.title}`}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside <ToastProvider>')
  }
  return context
}
