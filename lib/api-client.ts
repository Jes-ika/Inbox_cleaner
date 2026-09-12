'use client'

import { signIn } from 'next-auth/react'
import { ROUTES } from '@/utils/constants'

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/**
 * Call one of our own routes and turn a failure into an ApiError carrying the
 * server's own message, so screens never have to invent one.
 *
 * A refresh token that stopped working comes back as `reauth_required`; there is
 * nothing to show for that but Google's consent screen.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (response.ok) {
    return (await response.json()) as T
  }

  let message = `Request failed (${response.status})`
  let code: string | undefined

  try {
    const body = (await response.json()) as { error?: string; code?: string }
    if (body.error) message = body.error
    code = body.code
  } catch {
    // Non-JSON error body; the status-based message stands.
  }

  if (response.status === 401 && code === 'reauth_required') {
    void signIn('google', { callbackUrl: ROUTES.DASHBOARD })
  }

  throw new ApiError(message, response.status, code)
}
