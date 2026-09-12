import { NextResponse, type NextRequest } from 'next/server'
import { parseMessageIds, readJsonBody, requireAccessToken } from '@/lib/api-auth'
import { archiveMessages } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await requireAccessToken(request)
  if (!auth.ok) return auth.response

  const body = await readJsonBody(request)
  const ids = parseMessageIds(body.messageIds)
  if (!ids.ok) return ids.response

  try {
    const archivedCount = await archiveMessages(auth.accessToken, ids.messageIds)
    return NextResponse.json({ archivedCount, messageIds: ids.messageIds })
  } catch (error) {
    console.error('Failed to archive messages:', error)
    return NextResponse.json(
      { error: 'Gmail rejected the archive request. Nothing was changed.' },
      { status: 502 },
    )
  }
}
