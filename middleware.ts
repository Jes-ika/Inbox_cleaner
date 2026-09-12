import { withAuth } from 'next-auth/middleware'

/**
 * Protect the app routes at the edge.
 *
 * The pages also check the session client-side, but that check only runs after
 * hydration — long enough for an unauthenticated visitor to see the chrome of a
 * page they have no session for. This redirects before anything is sent.
 */
export default withAuth({
  pages: {
    signIn: '/',
  },
})

export const config = {
  matcher: ['/dashboard/:path*', '/subscriptions/:path*', '/cleanup/:path*', '/settings/:path*'],
}
