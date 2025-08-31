'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Download, File } from 'lucide-react'

interface ArrearsData {
  summary: {
    totalStudentsWithArrears: number
    totalArrearsAmount: number
    arrearsBreakdownByClass: Record<string, { count: number, amount: number }>
  }
  students: Array<{
    id: string
    admissionNumber: string
    firstName: string
    lastName: string
    middleName?: string
    class: string
    parentName: string
    parentPhone: string
    totalArrears: number
    arrearsBreakdown: Array<{
      feeName: string
      balance: number
      term?: string
      year: number
      dueDate?: string
    }>
  }>
}

export function ArrearsReport() {
  const [arrearsData, setArrearsData] = useState<ArrearsData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchArrearsReport = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/reports/arrears')
      const data = await response.json()
      
      if (response.ok) {
        setArrearsData(data)
      }
    } catch (error) {
      console.error('Error fetching arrears report:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArrearsReport()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  const exportToCSV = () => {
    if (!arrearsData) return

    const headers = [
      'Class',
      'Admission Number',
      'First Name',
      'Last Name',
      'Parent Name',
      'Parent Phone',
      'Total Arrears',
      'Fee Details'
    ]

    const rows = arrearsData.students.map(student => [
      student.class,
      student.admissionNumber,
      student.firstName,
      student.lastName,
      student.parentName,
      student.parentPhone,
      student.totalArrears,
      student.arrearsBreakdown.map(arr => `${arr.feeName}: ${formatCurrency(arr.balance)}`).join('; ')
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `school_arrears_report_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const exportToPDF = () => {
    if (!arrearsData) return

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>School Arrears Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 20px; }
        .school-name { color: #1e40af; font-size: 24px; font-weight: bold; margin: 0; }
        .report-title { color: #666; font-size: 18px; margin: 5px 0; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
        .summary-card { background: #f8f9fa; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0; color: #374151; font-size: 14px; }
        .summary-card p { margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #dc2626; }
        .class-section { margin: 20px 0; page-break-inside: avoid; }
        .class-header { background: #1e40af; color: white; padding: 10px; font-weight: bold; font-size: 14px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table th, .table td { padding: 6px; border: 1px solid #e5e7eb; text-align: left; font-size: 10px; }
        .table th { background: #f8f9fa; font-weight: bold; }
        .table tbody tr:nth-child(even) { background: #f9fafb; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 10px; }
        @media print { body { margin: 0; font-size: 9px; } .class-section { page-break-inside: avoid; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="school-name">St. Joseph's Academy</h1>
        <h2 class="report-title">School-Wide Arrears Report</h2>
        <p>Generated on ${new Date().toLocaleDateString('en-KE')}</p>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <h3>Students with Arrears</h3>
          <p>${arrearsData.summary.totalStudentsWithArrears}</p>
        </div>
        <div class="summary-card">
          <h3>Total Arrears Amount</h3>
          <p>${formatCurrency(arrearsData.summary.totalArrearsAmount)}</p>
        </div>
        <div class="summary-card">
          <h3>Classes Affected</h3>
          <p>${Object.keys(arrearsData.summary.arrearsBreakdownByClass).length}</p>
        </div>
      </div>

      ${Object.entries(
        arrearsData.students.reduce((acc, student) => {
          if (!acc[student.class]) acc[student.class] = []
          acc[student.class].push(student)
          return acc
        }, {} as Record<string, typeof arrearsData.students>)
      ).map(([className, students]) => `
        <div class="class-section">
          <div class="class-header">${className} - ${students.length} students with arrears</div>
          <table class="table">
            <thead>
              <tr>
                <th>Adm. No.</th>
                <th>Student Name</th>
                <th>Parent</th>
                <th>Phone</th>
                <th>Total Arrears</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(student => `
                <tr>
                  <td>${student.admissionNumber}</td>
                  <td>${student.firstName} ${student.lastName}</td>
                  <td>${student.parentName}</td>
                  <td>${student.parentPhone}</td>
                  <td style="color: #dc2626; font-weight: bold;">${formatCurrency(student.totalArrears)}</td>
                  <td>${student.arrearsBreakdown.map(arr => `${arr.feeName}: ${formatCurrency(arr.balance)}`).join(', ')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}

      <div class="footer">
        <p>Total arrears across all classes: ${formatCurrency(arrearsData.summary.totalArrearsAmount)}</p>
        <p>Report generated by St. Joseph's Academy Fee Management System</p>
      </div>
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
            <CardTitle>School Arrears Report</CardTitle>
            <CardDescription>
              Complete list of all students with outstanding fees, organized by class
            </CardDescription>
          </div>
          {arrearsData && (
            <div className="flex gap-2">
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={exportToPDF} variant="outline">
                <File className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2">Loading arrears report...</p>
          </div>
        ) : arrearsData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Students with Arrears</p>
                    <p className="text-2xl font-bold text-red-600">{arrearsData.summary.totalStudentsWithArrears}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Arrears</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(arrearsData.summary.totalArrearsAmount)}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Classes Affected</p>
                    <p className="text-2xl font-bold">{Object.keys(arrearsData.summary.arrearsBreakdownByClass).length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Students Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Total Arrears</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arrearsData.students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.class}</TableCell>
                      <TableCell>{student.admissionNumber}</TableCell>
                      <TableCell>{student.firstName} {student.lastName}</TableCell>
                      <TableCell>{student.parentName}</TableCell>
                      <TableCell>{student.parentPhone}</TableCell>
                      <TableCell className="text-red-600 font-bold">
                        {formatCurrency(student.totalArrears)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}