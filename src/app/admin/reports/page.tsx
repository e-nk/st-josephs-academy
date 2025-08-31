'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Download, FileSpreadsheet, Users, DollarSign } from 'lucide-react'

const classes = [
  'Baby Class',
  'PP1',
  'PP2', 
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
]

interface ClassReport {
  className: string
  summary: {
    totalStudents: number
    paidInFull: number
    partialPayment: number
    unpaid: number
    totalDue: number
    totalCollected: number
    totalOutstanding: number
  }
  students: Array<{
    id: string
    admissionNumber: string
    firstName: string
    lastName: string
    totalDue: number
    totalPaid: number
    totalBalance: number
    status: string
    lastPaymentDate: string | null
  }>
}

export default function ReportsPage() {
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [classReport, setClassReport] = useState<ClassReport | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchClassReport = async (className: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/class/${encodeURIComponent(className)}`)
      const data = await response.json()
      
      if (response.ok) {
        setClassReport(data)
      } else {
        console.error('Failed to fetch class report:', data.error)
      }
    } catch (error) {
      console.error('Error fetching class report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClassSelect = (className: string) => {
    setSelectedClass(className)
    fetchClassReport(className)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID_FULL':
        return <Badge className="bg-green-100 text-green-800">Paid Full</Badge>
      case 'PARTIAL':
        return <Badge variant="secondary">Partial</Badge>
      case 'UNPAID':
        return <Badge variant="destructive">Unpaid</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const exportToCSV = () => {
    if (!classReport) return

    const headers = [
      'Admission Number',
      'First Name', 
      'Last Name',
      'Total Due',
      'Total Paid',
      'Balance',
      'Status',
      'Last Payment'
    ]

    const rows = classReport.students.map(student => [
      student.admissionNumber,
      student.firstName,
      student.lastName,
      student.totalDue,
      student.totalPaid,
      student.totalBalance,
      student.status,
      student.lastPaymentDate || 'Never'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${classReport.className}_fee_report_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Fee Reports</h2>
        <p className="text-muted-foreground">
          Generate and download detailed fee reports by class
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class Fee Reports</CardTitle>
          <CardDescription>
            Select a class to view detailed fee payment reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Select value={selectedClass} onValueChange={handleClassSelect}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((className) => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {classReport && (
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2">Loading report...</p>
            </div>
          )}

          {classReport && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Students</p>
                        <p className="text-2xl font-bold">{classReport.summary.totalStudents}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Paid in Full</p>
                        <p className="text-2xl font-bold text-green-600">{classReport.summary.paidInFull}</p>
                      </div>
                      <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold">✓</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Outstanding</p>
                        <p className="text-2xl font-bold text-red-600">{classReport.summary.unpaid + classReport.summary.partialPayment}</p>
                      </div>
                      <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 font-bold">!</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Outstanding</p>
                        <p className="text-xl font-bold text-red-600">{formatCurrency(classReport.summary.totalOutstanding)}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Students Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admission No.</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Total Due</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classReport.students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.admissionNumber}
                        </TableCell>
                        <TableCell>
                          {student.firstName} {student.lastName}
                        </TableCell>
                        <TableCell>{formatCurrency(student.totalDue)}</TableCell>
                        <TableCell className="text-green-600">
                          {formatCurrency(student.totalPaid)}
                        </TableCell>
                        <TableCell className="text-red-600">
                          {formatCurrency(student.totalBalance)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(student.status)}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <FileSpreadsheet className="h-4 w-4 mr-1" />
                            Report
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}