import type { CleanupActionKind, EmailSender, PromotionalSummary } from '@/types'

/**
 * Apply a completed cleanup to a scan summary, so the screens can update without
 * paying for a full re-scan.
 *
 * The two actions are not the same shape, and treating them alike is wrong in
 * both directions:
 *
 * - **Trash** removes the message from the Promotions category entirely, so it
 *   leaves both the total and the inbox subset. A sender with nothing left drops
 *   off the list.
 * - **Archive** only drops the INBOX label. The message is still promotional
 *   mail from that sender, so the sender keeps its total count and stays listed
 *   on Subscriptions — only its inbox subset shrinks.
 *
 * Sizes are prorated because Gmail reports a per-message `sizeEstimate` that we
 * sum, and we do not keep the individual figures.
 *
 * Pure on purpose: the interesting logic here is the archive/trash asymmetry,
 * and keeping it out of the hook means it can be tested without a DOM.
 */
export function applyCleanupToSummary(
  summary: PromotionalSummary,
  kind: CleanupActionKind,
  messageIds: string[],
): PromotionalSummary {
  const touched = new Set(messageIds)

  const senders: EmailSender[] = []
  let totalEmails = 0
  let totalSizeBytes = 0
  let inboxEmails = 0
  let inboxSizeBytes = 0

  for (const sender of summary.senders) {
    const keptIds =
      kind === 'trash' ? sender.messageIds.filter((id) => !touched.has(id)) : sender.messageIds
    const keptInboxIds = sender.inboxMessageIds.filter((id) => !touched.has(id))

    // Trashed away entirely: no promotional mail left from this sender.
    if (keptIds.length === 0) continue

    const totalRatio = sender.messageIds.length ? keptIds.length / sender.messageIds.length : 0
    const inboxRatio = sender.inboxMessageIds.length
      ? keptInboxIds.length / sender.inboxMessageIds.length
      : 0

    const next: EmailSender = {
      ...sender,
      messageIds: keptIds,
      emailCount: keptIds.length,
      sizeBytes: Math.round(sender.sizeBytes * totalRatio),
      inboxMessageIds: keptInboxIds,
      inboxCount: keptInboxIds.length,
      inboxSizeBytes: Math.round(sender.inboxSizeBytes * inboxRatio),
    }

    senders.push(next)
    totalEmails += next.emailCount
    totalSizeBytes += next.sizeBytes
    inboxEmails += next.inboxCount
    inboxSizeBytes += next.inboxSizeBytes
  }

  return {
    ...summary,
    senders,
    totalEmails,
    totalSenders: senders.length,
    totalSizeBytes,
    inboxEmails,
    inboxSizeBytes,
  }
}
