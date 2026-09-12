import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchPromotionalEmails, groupEmailsBySender } from '@/lib/gmail'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const messages = await fetchPromotionalEmails(session)
    const senders = groupEmailsBySender(messages)

    return NextResponse.json({
      messages,
      senders: Array.from(senders.values()),
      totalEmails: messages.length,
      totalSenders: senders.size,
    })
  } catch (error) {
    console.error('Error fetching promotional emails:', error)
    return NextResponse.json(
      { error: 'Failed to fetch promotional emails' },
      { status: 500 }
    )
  }
}
