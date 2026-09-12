import { NextResponse, type NextRequest } from 'next/server'
import { requireAccessToken } from '@/lib/api-auth'
import { scanPromotionalEmails } from '@/lib/gmail'
import { DEFAULT_SCAN_LIMIT } from '@/utils/constants'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireAccessToken(request)
  if (!auth.ok) return auth.response

  const requested = Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '', 10)
  const limit = Number.isFinite(requested) ? requested : DEFAULT_SCAN_LIMIT

  try {
    const summary = await scanPromotionalEmails(auth.accessToken, limit)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Failed to scan promotional emails:', error)
    return NextResponse.json(
      { error: 'Could not read your promotional mail. Try again in a moment.' },
      { status: 502 },
    )
  }
}
