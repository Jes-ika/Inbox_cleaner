import { google } from 'googleapis'
import type { Session } from 'next-auth'

export interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  internalDate: string
  headers: Array<{
    name: string
    value: string
  }>
}

export interface EmailSenderInfo {
  email: string
  name: string
  count: number
  lastReceived: Date
  unsubscribeUrl?: string
  hasListUnsubscribe: boolean
}

export function getGmailClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  )

  oauth2Client.setCredentials({
    access_token: accessToken,
  })

  return google.gmail({ version: 'v1', auth: oauth2Client })
}

export async function fetchPromotionalEmails(session: Session | null) {
  if (!session?.accessToken) {
    throw new Error('No access token available')
  }

  const gmail = getGmailClient(session.accessToken)

  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'category:promotions',
      maxResults: 100,
    })

    const messages = response.data.messages || []

    // Fetch full message details
    const detailedMessages = await Promise.all(
      messages.map(msg =>
        gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'List-Unsubscribe'],
        })
      )
    )

    return detailedMessages.map(msg => ({
      id: msg.data.id,
      threadId: msg.data.threadId,
      labelIds: msg.data.labelIds || [],
      snippet: msg.data.snippet || '',
      internalDate: msg.data.internalDate || '',
      headers: msg.data.payload?.headers || [],
    })) as GmailMessage[]
  } catch (error) {
    console.error('Error fetching promotional emails:', error)
    throw error
  }
}

export function parseEmailHeader(headers: GmailMessage['headers'], headerName: string): string {
  const header = headers.find(h => h.name.toLowerCase() === headerName.toLowerCase())
  return header?.value || ''
}

export function extractEmailFromHeader(headerValue: string): string {
  const match = headerValue.match(/<(.+?)>/)
  return match ? match[1] : headerValue.split(' ')[0]
}

export function extractNameFromHeader(headerValue: string): string {
  const match = headerValue.match(/^(.+?)\s*</)
  return match ? match[1].trim().replace(/"/g, '') : headerValue.split('<')[0].trim()
}

export function parseListUnsubscribeHeader(headerValue: string): string | undefined {
  if (!headerValue) return undefined
  
  // Format: <mailto:...>, <https://...>
  const match = headerValue.match(/<(https?:\/\/[^>]+)>/)
  return match ? match[1] : undefined
}

export function groupEmailsBySender(messages: GmailMessage[]): Map<string, EmailSenderInfo> {
  const senderMap = new Map<string, EmailSenderInfo>()

  messages.forEach(msg => {
    const fromHeader = parseEmailHeader(msg.headers, 'From')
    const email = extractEmailFromHeader(fromHeader)
    const name = extractNameFromHeader(fromHeader)
    const listUnsubscribe = parseEmailHeader(msg.headers, 'List-Unsubscribe')
    const unsubscribeUrl = parseListUnsubscribeHeader(listUnsubscribe)

    if (senderMap.has(email)) {
      const sender = senderMap.get(email)!
      sender.count += 1
      sender.lastReceived = new Date(parseInt(msg.internalDate))
    } else {
      senderMap.set(email, {
        email,
        name: name || email,
        count: 1,
        lastReceived: new Date(parseInt(msg.internalDate)),
        unsubscribeUrl,
        hasListUnsubscribe: !!listUnsubscribe,
      })
    }
  })

  return senderMap
}

export async function archiveEmails(session: Session | null, messageIds: string[]) {
  if (!session?.accessToken) {
    throw new Error('No access token available')
  }

  const gmail = getGmailClient(session.accessToken)

  try {
    await Promise.all(
      messageIds.map(id =>
        gmail.users.messages.modify({
          userId: 'me',
          id,
          requestBody: {
            removeLabelIds: ['INBOX'],
          },
        })
      )
    )
  } catch (error) {
    console.error('Error archiving emails:', error)
    throw error
  }
}

export async function trashEmails(session: Session | null, messageIds: string[]) {
  if (!session?.accessToken) {
    throw new Error('No access token available')
  }

  const gmail = getGmailClient(session.accessToken)

  try {
    await Promise.all(
      messageIds.map(id =>
        gmail.users.messages.trash({
          userId: 'me',
          id,
        })
      )
    )
  } catch (error) {
    console.error('Error trashing emails:', error)
    throw error
  }
}

export async function unsubscribeFromSender(
  session: Session | null,
  unsubscribeUrl: string
): Promise<boolean> {
  if (!unsubscribeUrl) {
    return false
  }

  try {
    // If it's an HTTP URL, make a request
    if (unsubscribeUrl.startsWith('http')) {
      const response = await fetch(unsubscribeUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })
      return response.ok
    }

    // If it's a mailto link, we can't actually send it from the server
    // Return true to indicate the URL was found
    if (unsubscribeUrl.startsWith('mailto:')) {
      return true
    }

    return false
  } catch (error) {
    console.error('Error unsubscribing:', error)
    return false
  }
}
