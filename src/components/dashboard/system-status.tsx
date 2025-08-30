'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface SystemStatusProps {
  stats: {
    totalStudents: number
    activeFeeStructures: number
    paymentsToday: number
    totalOutstanding: number
    paymentMethodStats: Array<{
      method: string
      count: number
      amount: number
    }>
  }
}

export function SystemStatus({ stats }: SystemStatusProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  const systemHealth = () => {
    if (stats.totalStudents === 0) return { status: 'warning', message: 'No students registered' }
    if (stats.activeFeeStructures === 0) return { status: 'warning', message: 'No active fee structures' }
    if (stats.totalOutstanding > 0) return { status: 'info', message: 'Outstanding fees pending' }
    return { status: 'healthy', message: 'All systems operational' }
  }

  const health = systemHealth()

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {health.status === 'healthy' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {health.status === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
            {health.status === 'info' && <Clock className="h-5 w-5 text-blue-500" />}
            System Status
          </CardTitle>
          <CardDescription>Current system health overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Overall Status:</span>
              <Badge 
                variant={health.status === 'healthy' ? 'default' : 
                        health.status === 'warning' ? 'destructive' : 'secondary'}
              >
                {health.message}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Students Registered:</span>
              <span className="font-medium">{stats.totalStudents}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Active Fee Structures:</span>
              <span className="font-medium">{stats.activeFeeStructures}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Payments Today:</span>
              <span className="font-medium">{stats.paymentsToday}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Breakdown by payment method</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.paymentMethodStats.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No payments received yet
            </p>
          ) : (
            <div className="space-y-3">
              {stats.paymentMethodStats.map((method) => (
                <div key={method.method} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{method.method}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {method.count} transactions
                    </span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(method.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}