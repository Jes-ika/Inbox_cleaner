import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { trashEmails } from '@/lib/gmail'
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

    await trashEmails(session, messageIds)

    return NextResponse.json({
      success: true,
      trashedCount: messageIds.length,
    })
  } catch (error) {
    console.error('Error trashing emails:', error)
    return NextResponse.json(
      { error: 'Failed to trash emails' },
      { status: 500 }
    )
  }
}
