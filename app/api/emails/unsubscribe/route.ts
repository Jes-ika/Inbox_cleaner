import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { unsubscribeFromSender } from '@/lib/gmail'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { unsubscribeUrl } = await request.json()

    if (!unsubscribeUrl) {
      return NextResponse.json(
        { error: 'No unsubscribe URL provided' },
        { status: 400 }
      )
    }

    const success = await unsubscribeFromSender(session, unsubscribeUrl)

    return NextResponse.json({
      success,
      message: success
        ? 'Unsubscribe request sent'
        : 'Failed to unsubscribe',
    })
  } catch (error) {
    console.error('Error unsubscribing:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    )
  }
}
