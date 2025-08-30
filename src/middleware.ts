import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow access to login page
        if (pathname === '/admin/login') {
          return true
        }
        
        // Protect all other /admin routes
        if (pathname.startsWith('/admin')) {
          return !!token
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: ['/admin/:path*']
}