import Link from 'next/link'
import { ROUTES } from '@/utils/constants'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <p className="mb-2 font-mono text-sm text-gray-500">404</p>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">That page does not exist</h1>
        <p className="mb-6 text-gray-600">
          Check the address, or start again from the dashboard.
        </p>
        <div className="flex justify-center gap-6 text-sm">
          <Link href={ROUTES.HOME} className="font-medium text-blue-600 hover:underline">
            Home
          </Link>
          <Link href={ROUTES.DASHBOARD} className="font-medium text-blue-600 hover:underline">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
