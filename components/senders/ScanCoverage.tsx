import { formatCount } from '@/lib/format'
import type { PromotionalSummary } from '@/types'

interface ScanCoverageProps {
  summary: PromotionalSummary | null
  /** Cleanup acts on the inbox subset, so it needs the inbox numbers. */
  scope: 'all' | 'inbox'
}

/**
 * Says how much of the mailbox a scan actually covered.
 *
 * This matters more since discovery stopped being inbox-scoped: a 500-message
 * budget is now shared with archived mail, so the number of *actionable* inbox
 * messages it yields depends on the user's archiving habits. Without this, a
 * partial list reads as the whole picture.
 */
export function ScanCoverage({ summary, scope }: ScanCoverageProps) {
  if (!summary?.truncated) return null

  const scanned = scope === 'inbox' ? summary.inboxEmails : summary.totalEmails
  const estimate = scope === 'inbox' ? summary.inboxEstimate : summary.totalEstimate

  return (
    <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      This scan covered the {formatCount(summary.totalEmails)} most recent promotional
      messages
      {scope === 'inbox' ? `, ${formatCount(scanned)} of them still in your inbox` : ''}.
      {estimate > summary.totalEmails
        ? ` You have roughly ${formatCount(estimate)} in total, so there is more beyond this window.`
        : ' There is more mail beyond this window.'}
    </p>
  )
}
