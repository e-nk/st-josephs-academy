'use client'

import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface DashboardStats {
  totalStudents: number
  totalCollected: number
  totalOutstanding: number
  paymentsToday: number
  recentPayments: Array<{
    id: string
    amount: number
    confirmedAt: string | null
    student: {
      admissionNumber: string
      firstName: string
      lastName: string
    }
  }>
  recentStudents: Array<{
    id: string
    admissionNumber: string
    firstName: string
    lastName: string
    class: string
    createdAt: string
  }>
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/stats')
      const data = await response.json()
      
      if (response.ok) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your school's fee collection system
          </p>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your school's fee collection system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="m22 21-1.7-1.7" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalStudents === 0 
                ? 'No students registered yet'
                : `${stats?.totalStudents === 1 ? 'Student' : 'Students'} registered`
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20m9-7H3" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalCollected || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalCollected === 0
                ? 'No payments received yet'
                : 'From confirmed payments'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalOutstanding || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalOutstanding === 0
                ? 'No outstanding fees'
                : 'Pending fee payments'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Payments</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.paymentsToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.paymentsToday === 0
                ? 'No payments today'
                : 'Payments confirmed today'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Students */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Students</CardTitle>
            <CardDescription>Latest student registrations</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.recentStudents || stats.recentStudents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No students registered yet
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {student.admissionNumber} • {student.class}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(student.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Latest confirmed payments</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.recentPayments || stats.recentPayments.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No payments received yet
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">
                        {payment.student.firstName} {payment.student.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payment.student.admissionNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">
                        {formatCurrency(Number(payment.amount))}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {payment.confirmedAt ? formatDate(payment.confirmedAt) : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started with your fee management system
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/students">
            <Card className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="text-center space-y-2">
                <h3 className="font-semibold">Add Students</h3>
                <p className="text-sm text-muted-foreground">Register new students to the system</p>
              </div>
            </Card>
          </Link>
          
          <Link href="/admin/fees">
						<Card className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
							<div className="text-center space-y-2">
								<h3 className="font-semibold">Set Fee Structure</h3>
								<p className="text-sm text-muted-foreground">Configure fees for terms and years</p>
							</div>
						</Card>
					</Link>
          
          <Card className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="text-center space-y-2">
              <h3 className="font-semibold">View Payments</h3>
              <p className="text-sm text-muted-foreground">Check payment history and status</p>
            </div>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}