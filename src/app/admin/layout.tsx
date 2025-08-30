'use client'

import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'unauthenticated' && pathname !== '/admin/login') {
      router.push('/admin/login')
    }
  }, [status, pathname, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login page without layout wrapper
  if (pathname === '/admin/login') {
    return children
  }

  // Show loading if no session for protected routes
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin', current: pathname === '/admin' },
    { name: 'Students', href: '/admin/students', current: pathname === '/admin/students' },
    { name: 'Fee Structure', href: '/admin/fees', current: pathname === '/admin/fees' },
    { name: 'Payments', href: '/admin/payments', current: pathname === '/admin/payments' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                St. Joseph's Academy - Fee Management
              </h1>
              <p className="text-sm text-gray-500">
                Welcome, {session.user.name || session.user.email}
              </p>
            </div>
            <Button
              onClick={() => signOut({ callbackUrl: '/admin/login' })}
              variant="outline"
            >
              Sign Out
            </Button>
          </div>
          
          {/* Navigation */}
          <nav className="flex space-x-8 pb-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  item.current
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                    : 'text-gray-500'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}