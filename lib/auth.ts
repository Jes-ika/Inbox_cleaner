import type { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import GoogleProvider from 'next-auth/providers/google'
import { GMAIL_SCOPES, ROUTES } from '@/utils/constants'

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

/** Refresh this far before the token actually expires, so an in-flight request never races the clock. */
const REFRESH_LEEWAY_MS = 60_000

interface GoogleRefreshResponse {
  access_token?: string
  expires_in?: number
  refresh_token?: string
  error?: string
  error_description?: string
}

export interface RefreshedTokens {
  accessToken: string
  /** Unix seconds. */
  expiresAt: number
  refreshToken: string
}

/**
 * Exchange a refresh token for a fresh access token, or null when the refresh
 * token itself is no longer good.
 *
 * Exported because route handlers need it too: getToken() only decrypts the
 * cookie, it does not run the jwt callback, so a route can be handed an access
 * token that expired while the tab sat open.
 */
export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<RefreshedTokens | null> {
  try {
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    const refreshed = (await response.json()) as GoogleRefreshResponse

    if (!response.ok || !refreshed.access_token) {
      throw new Error(refreshed.error_description || refreshed.error || 'Token refresh failed')
    }

    return {
      accessToken: refreshed.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 3600),
      // Google only returns a new refresh token when the old one is rotated out.
      refreshToken: refreshed.refresh_token ?? refreshToken,
    }
  } catch (error) {
    console.error('Failed to refresh Google access token:', error)
    return null
  }
}

/**
 * Google access tokens last about an hour. On failure we keep the rest of the
 * token but stamp it with an error so the client can ask for consent again
 * rather than silently issuing 401s for the rest of the session.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) {
    return { ...token, accessToken: undefined, error: 'RefreshAccessTokenError' }
  }

  const refreshed = await refreshGoogleAccessToken(token.refreshToken)

  if (!refreshed) {
    return { ...token, accessToken: undefined, error: 'RefreshAccessTokenError' }
  }

  return {
    ...token,
    accessToken: refreshed.accessToken,
    expiresAt: refreshed.expiresAt,
    refreshToken: refreshed.refreshToken,
    error: undefined,
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: ['openid', 'email', 'profile', ...GMAIL_SCOPES].join(' '),
          // Required to receive a refresh token at all.
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: account is only present on the first call.
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          error: undefined,
        }
      }

      if (token.expiresAt && Date.now() < token.expiresAt * 1000 - REFRESH_LEEWAY_MS) {
        return token
      }

      return refreshAccessToken(token)
    },

    // Tokens deliberately stay out of the session: /api/auth/session is readable
    // by any script on the page, and the refresh token carries full gmail.modify
    // access. Route handlers read them from the JWT with getAccessToken() instead.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || ''
      }
      session.error = token.error
      return session
    },
  },
  pages: {
    signIn: ROUTES.HOME,
    error: ROUTES.HOME,
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}
