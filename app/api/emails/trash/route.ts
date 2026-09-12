import { NextResponse, type NextRequest } from 'next/server'
import { parseMessageIds, readJsonBody, requireAccessToken } from '@/lib/api-auth'
import { trashMessages } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await requireAccessToken(request)
  if (!auth.ok) return auth.response

  const body = await readJsonBody(request)
  const ids = parseMessageIds(body.messageIds)
  if (!ids.ok) return ids.response

  try {
    const { succeeded, failed } = await trashMessages(auth.accessToken, ids.messageIds)

    // Nothing moved at all: that is a failure, not a partial success.
    if (succeeded.length === 0) {
      return NextResponse.json(
        { error: 'Gmail rejected every message in that request. Nothing was moved.' },
        { status: 502 },
      )
    }

    // messageIds is what undo should act on, so it lists only what moved.
    return NextResponse.json({ trashedCount: succeeded.length, failed, messageIds: succeeded })
  } catch (error) {
    console.error('Failed to trash messages:', error)
    return NextResponse.json(
      { error: 'Gmail rejected the trash request. Nothing was moved.' },
      { status: 502 },
    )
  }
}
