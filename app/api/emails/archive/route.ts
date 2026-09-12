import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { archiveEmails } from '@/lib/gmail'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messageIds } = await request.json()

    if (!messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json(
        { error: 'Invalid messageIds' },
        { status: 400 }
      )
    }

    await archiveEmails(session, messageIds)

    return NextResponse.json({
      success: true,
      archivedCount: messageIds.length,
    })
  } catch (error) {
    console.error('Error archiving emails:', error)
    return NextResponse.json(
      { error: 'Failed to archive emails' },
      { status: 500 }
    )
  }
}
