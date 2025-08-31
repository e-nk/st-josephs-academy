'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TrendingUp, Calendar, DollarSign } from 'lucide-react'

interface AnnualReportData {
  academicYear: number
  summary: {
    totalCollected: number
    totalTransactions: number
    averagePaymentAmount: number
  }
  monthlyBreakdown: Array<{
    month: number
    total: number
    count: number
  }>
  feeStructureAnalysis: Array<{
    feeStructure: string
    term?: string
    studentsAssigned: number
    expectedAmount: number
    collectedAmount: number
    outstandingAmount: number
    collectionRate: number
  }>
  studentDistribution: Array<{
    status: string
    class: string
    _count: number
  }>
}

export function AnnualReport() {
  const [selectedYear, setSelectedYear] = useState<string>('2024')
  const [reportData, setReportData] = useState<AnnualReportData | null>(null)
  const [loading, setLoading] = useState(false)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const fetchAnnualReport = async (year: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/annual/${year}`)
      const data = await response.json()
      
      if (response.ok) {
        setReportData(data)
      }
    } catch (error) {
      console.error('Error fetching annual report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleYearSelect = (year: string) => {
    setSelectedYear(year)
    fetchAnnualReport(year)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[month - 1] || 'Unknown'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Annual Financial Report</CardTitle>
            <CardDescription>
              Comprehensive year-end collection and financial analysis
            </CardDescription>
          </div>
          <Select value={selectedYear} onValueChange={handleYearSelect}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2">Loading annual report...</p>
          </div>
        ) : reportData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Collected</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(reportData.summary.totalCollected)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Transactions</p>
                      <p className="text-2xl font-bold">{reportData.summary.totalTransactions}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Average Payment</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(reportData.summary.averagePaymentAmount)}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Collection Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Amount Collected</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Average per Transaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.monthlyBreakdown.map((month) => (
                      <TableRow key={month.month}>
                        <TableCell className="font-medium">
                          {getMonthName(month.month)}
                        </TableCell>
                        <TableCell className="text-green-600">
                          {formatCurrency(month.total)}
                        </TableCell>
                        <TableCell>{month.count}</TableCell>
                        <TableCell>
                          {formatCurrency(month.count > 0 ? month.total / month.count : 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Fee Structure Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Fee Structure Collection Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Structure</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Collection Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.feeStructureAnalysis.map((fee, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{fee.feeStructure}</TableCell>
                        <TableCell>{fee.studentsAssigned}</TableCell>
                        <TableCell>{formatCurrency(fee.expectedAmount)}</TableCell>
                        <TableCell className="text-green-600">
                          {formatCurrency(fee.collectedAmount)}
                        </TableCell>
                        <TableCell className="text-red-600">
                          {formatCurrency(fee.outstandingAmount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${Math.min(fee.collectionRate, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm">{fee.collectionRate.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Select a year to view annual report</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}