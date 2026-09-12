import { NextResponse, type NextRequest } from 'next/server'
import { parseMessageIds, readJsonBody, requireAccessToken } from '@/lib/api-auth'
import { unarchiveMessages, untrashMessages } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

/**
 * Reverse the last cleanup.
 *
 * Both directions are genuinely reversible in Gmail: archiving only removes the
 * INBOX label, and trashing is a label move with a 30-day grace period. The
 * client sends back the ids the original call returned.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAccessToken(request)
  if (!auth.ok) return auth.response

  const body = await readJsonBody(request)

  if (body.kind !== 'trash' && body.kind !== 'archive') {
    return NextResponse.json({ error: 'kind must be "trash" or "archive".' }, { status: 400 })
  }

  const ids = parseMessageIds(body.messageIds)
  if (!ids.ok) return ids.response

  try {
    const restoredCount =
      body.kind === 'trash'
        ? await untrashMessages(auth.accessToken, ids.messageIds)
        : await unarchiveMessages(auth.accessToken, ids.messageIds)

    return NextResponse.json({ restoredCount })
  } catch (error) {
    console.error('Failed to undo cleanup:', error)
    return NextResponse.json(
      { error: 'Could not restore those messages. They are still in Gmail — check Trash or All Mail.' },
      { status: 502 },
    )
  }
}
