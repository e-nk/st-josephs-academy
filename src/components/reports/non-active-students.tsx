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
import { Download, File, GraduationCap, UserX, ArrowRight, Users, DollarSign } from 'lucide-react'

interface NonActiveStudent {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  middleName?: string
  lastClass: string
  status: string
  graduationYear?: number
  currentAcademicYear: number
  notes?: string
  parentName: string
  parentPhone: string
  totalDue: number
  totalPaid: number
  totalBalance: number
  paymentStatus: string
  lastPaymentDate: string | null
  updatedAt: string
}

interface NonActiveReport {
  summary: {
    totalNonActiveStudents: number
    graduatedCount: number
    transferredCount: number
    withdrawnCount: number
    studentsWithArrears: number
    totalOutstandingAmount: number
    fullyPaidCount: number
    availableGraduationYears: number[]
  }
  students: NonActiveStudent[]
}

export function NonActiveStudents() {
  const [reportData, setReportData] = useState<NonActiveReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL_NON_ACTIVE')
  const [graduationYearFilter, setGraduationYearFilter] = useState('ALL_YEARS')

  useEffect(() => {
    fetchNonActiveReport()
  }, [statusFilter, graduationYearFilter])

  const fetchNonActiveReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL_NON_ACTIVE') {
        params.set('status', statusFilter)
      }
      if (graduationYearFilter !== 'ALL_YEARS') {
        params.set('graduationYear', graduationYearFilter)
      }

      const response = await fetch(`/api/reports/non-active?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setReportData(data)
      }
    } catch (error) {
      console.error('Error fetching non-active report:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-KE')
  }

  const getStatusBadge = (status: string, graduationYear?: number) => {
    switch (status) {
      case 'GRADUATED':
        return <Badge className="bg-purple-100 text-purple-800">Graduated {graduationYear || ''}</Badge>
      case 'TRANSFERRED':
        return <Badge className="bg-yellow-100 text-yellow-800">Transferred</Badge>
      case 'WITHDRAWN':
        return <Badge className="bg-red-100 text-red-800">Withdrawn</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID_FULL':
        return <Badge className="bg-green-100 text-green-800">Paid Full</Badge>
      case 'PARTIAL':
        return <Badge variant="secondary">Partial Payment</Badge>
      case 'UNPAID':
        return <Badge variant="destructive">Unpaid</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const exportToCSV = () => {
    if (!reportData) return

    const headers = [
      'Admission Number',
      'First Name',
      'Last Name',
      'Last Class',
      'Status',
      'Graduation Year',
      'Parent Name',
      'Parent Phone',
      'Total Due',
      'Total Paid',
      'Balance',
      'Payment Status',
      'Notes'
    ]

    const rows = reportData.students.map(student => [
      student.admissionNumber,
      student.firstName,
      student.lastName,
      student.lastClass,
      student.status,
      student.graduationYear || '',
      student.parentName,
      student.parentPhone,
      student.totalDue,
      student.totalPaid,
      student.totalBalance,
      student.paymentStatus,
      student.notes || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `non_active_students_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const exportToPDF = () => {
    if (!reportData) return

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Non-Active Students Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 20px; }
        .school-name { color: #1e40af; font-size: 24px; font-weight: bold; margin: 0; }
        .report-title { color: #666; font-size: 18px; margin: 5px 0; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
        .summary-card { background: #f8f9fa; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; text-align: center; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 6px; border: 1px solid #e5e7eb; text-align: left; font-size: 10px; }
        .table th { background: #f8f9fa; font-weight: bold; }
        @media print { body { margin: 0; font-size: 9px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="school-name">St. Joseph's Academy</h1>
        <h2 class="report-title">Non-Active Students Report</h2>
        <p>Graduated, Transferred & Withdrawn Students</p>
        <p>Generated on ${new Date().toLocaleDateString('en-KE')}</p>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <h3>Total Non-Active</h3>
          <p>${reportData.summary.totalNonActiveStudents}</p>
        </div>
        <div class="summary-card">
          <h3>With Arrears</h3>
          <p>${reportData.summary.studentsWithArrears}</p>
        </div>
        <div class="summary-card">
          <h3>Fully Paid</h3>
          <p>${reportData.summary.fullyPaidCount}</p>
        </div>
        <div class="summary-card">
          <h3>Outstanding Amount</h3>
          <p>${formatCurrency(reportData.summary.totalOutstandingAmount)}</p>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Adm. No.</th>
            <th>Name</th>
            <th>Last Class</th>
            <th>Status</th>
            <th>Balance</th>
            <th>Parent</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.students.map(student => `
            <tr>
              <td>${student.admissionNumber}</td>
              <td>${student.firstName} ${student.lastName}</td>
              <td>${student.lastClass}</td>
              <td>${student.status} ${student.graduationYear || ''}</td>
              <td style="color: ${student.totalBalance > 0 ? '#dc2626' : '#059669'}">${formatCurrency(student.totalBalance)}</td>
              <td>${student.parentName}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
    `
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Non-Active Students
            </CardTitle>
            <CardDescription>
              Graduated, transferred, and withdrawn students with their fee status
            </CardDescription>
          </div>
          {reportData && (
            <div className="flex gap-2">
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button onClick={exportToPDF} variant="outline" size="sm">
                <File className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_NON_ACTIVE">All Non-Active</SelectItem>
              <SelectItem value="GRADUATED">Graduated Only</SelectItem>
              <SelectItem value="TRANSFERRED">Transferred Only</SelectItem>
              <SelectItem value="WITHDRAWN">Withdrawn Only</SelectItem>
            </SelectContent>
          </Select>

          {reportData && reportData.summary.availableGraduationYears.length > 0 && (
            <Select value={graduationYearFilter} onValueChange={setGraduationYearFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by graduation year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_YEARS">All Years</SelectItem>
                {reportData.summary.availableGraduationYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2">Loading non-active students...</p>
          </div>
        ) : reportData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Non-Active</p>
                      <p className="text-2xl font-bold">{reportData.summary.totalNonActiveStudents}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">With Arrears</p>
                      <p className="text-2xl font-bold text-red-600">{reportData.summary.studentsWithArrears}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Fully Paid</p>
                      <p className="text-2xl font-bold text-green-600">{reportData.summary.fullyPaidCount}</p>
                    </div>
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-bold">✓</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(reportData.summary.totalOutstandingAmount)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Students Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Last Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Last Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.admissionNumber}</TableCell>
                    <TableCell>
                      {student.firstName} {student.lastName}
                      {student.notes && (
                        <div className="text-xs text-muted-foreground truncate max-w-32" title={student.notes}>
                          {student.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{student.lastClass}</TableCell>
                    <TableCell>{getStatusBadge(student.status, student.graduationYear)}</TableCell>
                    <TableCell className={student.totalBalance > 0 ? "text-red-600 font-bold" : "text-green-600"}>
                      {formatCurrency(student.totalBalance)}
                    </TableCell>
                    <TableCell>{getPaymentStatusBadge(student.paymentStatus)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{student.parentName}</div>
                        <div className="text-xs text-muted-foreground">{student.parentPhone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(student.lastPaymentDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No non-active students found</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}