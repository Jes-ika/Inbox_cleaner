import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'
import { refreshGoogleAccessToken } from '@/lib/auth'
import { MAX_MESSAGES_PER_ACTION } from '@/utils/constants'

export type AccessTokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; response: NextResponse }

/** Refresh this far before nominal expiry so a long request does not race the clock. */
const EXPIRY_LEEWAY_MS = 30_000

function reauthRequired(): AccessTokenResult {
  return {
    ok: false,
    response: NextResponse.json(
      {
        error: 'Your Gmail connection expired. Reconnect to continue.',
        code: 'reauth_required',
      },
      { status: 401 },
    ),
  }
}

/**
 * Read the Gmail access token from the session JWT.
 *
 * The token lives in the encrypted cookie and never in the session object the
 * browser can read, so route handlers have to ask for it here rather than
 * pulling it off getServerSession().
 *
 * getToken() only decrypts that cookie — it does not run the jwt callback — so
 * the stored access token can be an hour old on a tab that was left open. We
 * check the expiry ourselves and refresh for this request, because handing an
 * expired token to Gmail produces a 401 that surfaces as a misleading 502 with
 * no path to recovery.
 */
export async function requireAccessToken(request: NextRequest): Promise<AccessTokenResult> {
  const token = await getToken({ req: request })

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }),
    }
  }

  if (token.error === 'RefreshAccessTokenError') return reauthRequired()

  const expired = token.expiresAt ? Date.now() >= token.expiresAt * 1000 - EXPIRY_LEEWAY_MS : true

  if (!expired && token.accessToken) {
    return { ok: true, accessToken: token.accessToken }
  }

  if (!token.refreshToken) return reauthRequired()

  const refreshed = await refreshGoogleAccessToken(token.refreshToken)
  if (!refreshed) return reauthRequired()

  // The cookie is not rewritten here — only the jwt callback can do that, on the
  // client's next session poll. SessionProvider refetches often enough that this
  // inline refresh stays the exception rather than every request.
  return { ok: true, accessToken: refreshed.accessToken }
}

/** Gmail message ids are short URL-safe strings; anything else is not worth sending on. */
const MESSAGE_ID = /^[A-Za-z0-9_-]{1,128}$/

export type ParsedIds = { ok: true; messageIds: string[] } | { ok: false; response: NextResponse }

/** Validate and bound a `messageIds` array from a request body. */
export function parseMessageIds(value: unknown): ParsedIds {
  const bad = (error: string) => ({
    ok: false as const,
    response: NextResponse.json({ error }, { status: 400 }),
  })

  if (!Array.isArray(value)) return bad('messageIds must be an array.')
  if (value.length === 0) return bad('Select at least one message.')
  if (value.length > MAX_MESSAGES_PER_ACTION) {
    return bad(`Too many messages at once. The limit is ${MAX_MESSAGES_PER_ACTION}.`)
  }
  if (!value.every((id) => typeof id === 'string' && MESSAGE_ID.test(id))) {
    return bad('messageIds contains an entry that is not a Gmail message id.')
  }

  return { ok: true, messageIds: Array.from(new Set(value as string[])) }
}

export async function readJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await request.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}
