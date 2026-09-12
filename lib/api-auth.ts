import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'
import { MAX_MESSAGES_PER_ACTION } from '@/utils/constants'

export type AccessTokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; response: NextResponse }

/**
 * Read the Gmail access token from the session JWT.
 *
 * The token lives in the encrypted cookie and never in the session object the
 * browser can read, so route handlers have to ask for it here rather than
 * pulling it off getServerSession().
 */
export async function requireAccessToken(request: NextRequest): Promise<AccessTokenResult> {
  const token = await getToken({ req: request })

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }),
    }
  }

  if (token.error === 'RefreshAccessTokenError' || !token.accessToken) {
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

  return { ok: true, accessToken: token.accessToken }
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
