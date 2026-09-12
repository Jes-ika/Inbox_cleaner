import { NextResponse, type NextRequest } from 'next/server'
import { readJsonBody, requireAccessToken } from '@/lib/api-auth'
import { findUnsubscribeTarget, isPlausibleEmail } from '@/lib/gmail'
import { UnsafeUrlError, safeFetch } from '@/lib/safe-fetch'
import type { UnsubscribeStatus } from '@/types'

export const dynamic = 'force-dynamic'

interface UnsubscribeResult {
  status: UnsubscribeStatus
  message: string
  /** Present when the user has to finish the job themselves. */
  actionUrl?: string
}

/**
 * Unsubscribe from a sender.
 *
 * The request carries an email address, never a URL. The server looks the
 * unsubscribe endpoint up from the `List-Unsubscribe` header of that sender's
 * own mail in this user's mailbox, then validates it before fetching — see
 * lib/safe-fetch.ts for why that matters.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAccessToken(request)
  if (!auth.ok) return auth.response

  const body = await readJsonBody(request)
  const sender = typeof body.sender === 'string' ? body.sender.trim().toLowerCase() : ''

  if (!isPlausibleEmail(sender)) {
    return NextResponse.json({ error: 'sender must be an email address.' }, { status: 400 })
  }

  let target
  try {
    target = await findUnsubscribeTarget(auth.accessToken, sender)
  } catch (error) {
    console.error('Failed to look up unsubscribe headers:', error)
    return NextResponse.json({ error: 'Could not read that sender’s mail.' }, { status: 502 })
  }

  if (!target) {
    const result: UnsubscribeResult = {
      status: 'unavailable',
      message: 'This sender publishes no unsubscribe link. Blocking them is the only option.',
    }
    return NextResponse.json(result)
  }

  // A mailto: unsubscribe needs an email sent from the user's account, which
  // would mean asking for gmail.send. Report it plainly instead of pretending.
  if (target.kind === 'mailto') {
    const query = new URLSearchParams({ subject: target.subject || 'unsubscribe' })
    const result: UnsubscribeResult = {
      status: 'manual',
      message: 'This sender only accepts unsubscribes by email. Opening a draft is up to you.',
      actionUrl: `mailto:${target.address}?${query.toString()}`,
    }
    return NextResponse.json(result)
  }

  if (!target.url.toLowerCase().startsWith('https://')) {
    const result: UnsubscribeResult = {
      status: 'manual',
      message: 'This sender’s unsubscribe link is not HTTPS, so we will not open it for you.',
      actionUrl: target.url,
    }
    return NextResponse.json(result)
  }

  try {
    // RFC 8058: when the sender advertises one-click, the unsubscribe is a POST
    // with this exact body. A GET is what image pre-fetchers do, and senders
    // routinely ignore it.
    const response = target.oneClick
      ? await safeFetch(target.url, {
          method: 'POST',
          body: 'List-Unsubscribe=One-Click',
          contentType: 'application/x-www-form-urlencoded',
        })
      : await safeFetch(target.url, { method: 'GET' })

    if (response.ok) {
      // A 301/302/303 turns our POST into a GET, so the one-click body never
      // arrived. Reporting that as "accepted" would be a guess, not a result.
      if (target.oneClick && !response.methodPreserved) {
        const result: UnsubscribeResult = {
          status: 'manual',
          message:
            'The sender redirected the one-click request, so we cannot confirm it went through. Finish it in the browser.',
          actionUrl: target.url,
        }
        return NextResponse.json(result)
      }

      const result: UnsubscribeResult = {
        status: 'unsubscribed',
        message: target.oneClick
          ? 'One-click unsubscribe accepted.'
          : 'Unsubscribe request sent. Some senders need a confirmation click.',
        actionUrl: target.oneClick ? undefined : target.url,
      }
      return NextResponse.json(result)
    }

    const result: UnsubscribeResult = {
      status: 'failed',
      message: `The sender’s unsubscribe endpoint returned ${response.status}. Try the link yourself.`,
      actionUrl: target.url,
    }
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      console.warn('Blocked unsafe unsubscribe URL:', error.message)
      const result: UnsubscribeResult = {
        status: 'manual',
        message: 'That unsubscribe link points somewhere we will not request. Open it yourself if you trust it.',
        actionUrl: target.url,
      }
      return NextResponse.json(result)
    }

    console.error('Unsubscribe request failed:', error)
    const result: UnsubscribeResult = {
      status: 'failed',
      message: 'The sender’s unsubscribe endpoint did not respond.',
      actionUrl: target.url,
    }
    return NextResponse.json(result)
  }
}
