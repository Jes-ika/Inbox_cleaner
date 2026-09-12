import { Database, ListTree, Mail, Undo2 } from 'lucide-react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { ConnectButton } from '@/components/marketing/ConnectButton'
import { Card, CardContent } from '@/components/ui/Card'
import { APP_NAME, ROUTES } from '@/utils/constants'

const FEATURES = [
  {
    icon: Mail,
    title: 'One-click unsubscribe',
    description:
      'Uses the RFC 8058 unsubscribe endpoint senders publish, and tells you plainly when a sender offers none.',
  },
  {
    icon: ListTree,
    title: 'Grouped by sender',
    description:
      'Counts, dates and mailbox size per sender, so you can see who is worth acting on before you act.',
  },
  {
    icon: Undo2,
    title: 'Reversible cleanup',
    description:
      'Archive and trash are both undoable, and nothing is ever deleted permanently.',
  },
  {
    icon: Database,
    title: 'Nothing stored',
    description:
      'Your mail is read to render a page and then discarded. No database, no copies, no analytics on your inbox.',
  },
]

const STEPS = [
  {
    title: 'Connect Gmail',
    description: 'Grant access through Google. You can revoke it from your Google account at any time.',
  },
  {
    title: 'Review senders',
    description: 'Promotional mail grouped by who sent it, with counts and last-received dates.',
  },
  {
    title: 'Unsubscribe or clean up',
    description: 'Two separate decisions — stop future mail, clear the backlog, or both.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <section className="mb-16 text-center lg:mb-20">
          <h1 className="mb-6 text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Reclaim your inbox
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 sm:text-xl">
            Unsubscribe from newsletters and clear out promotional mail, one sender at a time or
            in bulk. Every action is reversible.
          </p>
          <ConnectButton />
        </section>

        <section className="mb-16 grid gap-6 md:grid-cols-2 lg:mb-20 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Icon className="mb-4 h-10 w-10 text-blue-600" aria-hidden="true" />
                  <h2 className="mb-2 font-semibold text-gray-900">{title}</h2>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mb-16 rounded-lg bg-white p-8 shadow-lg sm:p-12 lg:mb-20">
          <h2 className="mb-10 text-center text-3xl font-bold text-gray-900">How it works</h2>
          <ol className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-lg font-bold text-blue-600">{index + 1}</span>
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white/70 p-8 text-center">
          <h2 className="mb-3 text-2xl font-bold text-gray-900 sm:text-3xl">
            What InboxClean can see
          </h2>
          <p className="mx-auto mb-6 max-w-2xl text-gray-600">
            Access is limited to the single Gmail scope needed to read your mail and change its
            labels. Messages are processed on our server while a page loads and never written to
            a database. Read the{' '}
            <Link href={ROUTES.PRIVACY} className="font-medium text-blue-600 hover:underline">
              privacy policy
            </Link>{' '}
            for the specifics.
          </p>
          <ConnectButton>Connect Gmail</ConnectButton>
        </section>
      </main>

      <footer className="mt-16 bg-gray-900 py-8 text-gray-400">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 text-center text-sm sm:px-6 lg:px-8">
          <nav aria-label="Legal" className="flex gap-6">
            <Link href={ROUTES.PRIVACY} className="hover:text-white">
              Privacy
            </Link>
            <Link href={ROUTES.TERMS} className="hover:text-white">
              Terms
            </Link>
          </nav>
          <p>
            {APP_NAME} — open source, MIT licensed.
          </p>
        </div>
      </footer>
    </div>
  )
}
