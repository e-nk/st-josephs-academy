'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Download, Printer } from 'lucide-react'

interface StudentReportProps {
  open: boolean
  onClose: () => void
  studentId: string
}

interface StudentReport {
  student: {
    id: string
    admissionNumber: string
    firstName: string
    lastName: string
    middleName?: string
    class: string
    parentName: string
    parentPhone: string
    parentEmail?: string
    dateOfBirth?: string
    createdAt: string
  }
  financialSummary: {
    totalDue: number
    totalPaid: number
    totalBalance: number
    paymentStatus: string
  }
  feeAssignments: Array<{
    id: string
    feeStructure: {
      name: string
      term?: string
      year: number
      dueDate?: string
    }
    amountDue: number
    amountPaid: number
    balance: number
    status: string
  }>
  paymentHistory: Array<{
    id: string
    amount: number
    transactionId: string
    paymentMethod: string
    status: string
    paidAt?: string
    confirmedAt?: string
    createdAt: string
  }>
}

export function StudentReport({ open, onClose, studentId }: StudentReportProps) {
  const [report, setReport] = useState<StudentReport | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && studentId) {
      fetchStudentReport()
    }
  }, [open, studentId])

  const fetchStudentReport = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/student/${studentId}`)
      const data = await response.json()
      
      if (response.ok) {
        setReport(data)
      }
    } catch (error) {
      console.error('Error fetching student report:', error)
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
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID_FULL':
        return <Badge className="bg-green-100 text-green-800">Paid Full</Badge>
      case 'PARTIAL':
        return <Badge variant="secondary">Partial</Badge>
      case 'CONFIRMED':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const printReport = () => {
    window.print()
  }

  const downloadPDF = async () => {
    if (!report) return
    
    // Generate PDF content
    const content = generatePDFContent(report)
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(content)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }

  const generatePDFContent = (data: StudentReport) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Student Fee Report - ${data.student.firstName} ${data.student.lastName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 20px; }
        .school-name { color: #1e40af; font-size: 24px; font-weight: bold; margin: 0; }
        .report-title { color: #666; font-size: 18px; margin: 5px 0; }
        .student-info { margin: 20px 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .info-item { padding: 10px; background: #f8f9fa; border-radius: 5px; }
        .label { font-weight: bold; color: #374151; }
        .value { color: #1f2937; }
        .summary-card { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; }
        .summary-item h3 { margin: 0; font-size: 18px; }
        .summary-item p { margin: 5px 0 0 0; font-size: 24px; font-weight: bold; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
        .table th { background: #f8f9fa; font-weight: bold; }
        .status-paid { background: #d1fae5; color: #059669; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .status-pending { background: #fef3c7; color: #d97706; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; }
        @media print { body { margin: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="school-name">St. Joseph's Academy</h1>
        <h2 class="report-title">Student Fee Report</h2>
        <p>Generated on ${new Date().toLocaleDateString('en-KE')}</p>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <div class="label">Student Name</div>
          <div class="value">${data.student.firstName} ${data.student.middleName || ''} ${data.student.lastName}</div>
        </div>
        <div class="info-item">
          <div class="label">Admission Number</div>
          <div class="value">${data.student.admissionNumber}</div>
        </div>
        <div class="info-item">
          <div class="label">Class</div>
          <div class="value">${data.student.class}</div>
        </div>
        <div class="info-item">
          <div class="label">Parent/Guardian</div>
          <div class="value">${data.student.parentName}</div>
        </div>
      </div>

      <div class="summary-card">
        <div class="summary-grid">
          <div class="summary-item">
            <h3>Total Due</h3>
            <p>${formatCurrency(data.financialSummary.totalDue)}</p>
          </div>
          <div class="summary-item">
            <h3>Total Paid</h3>
            <p>${formatCurrency(data.financialSummary.totalPaid)}</p>
          </div>
          <div class="summary-item">
            <h3>Balance</h3>
            <p>${formatCurrency(data.financialSummary.totalBalance)}</p>
          </div>
        </div>
      </div>

      <h3>Fee Breakdown</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Fee Type</th>
            <th>Amount Due</th>
            <th>Amount Paid</th>
            <th>Balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.feeAssignments.map(fee => `
            <tr>
              <td>${fee.feeStructure.name}</td>
              <td>${formatCurrency(fee.amountDue)}</td>
              <td>${formatCurrency(fee.amountPaid)}</td>
              <td>${formatCurrency(fee.balance)}</td>
              <td><span class="status-${fee.status.toLowerCase()}">${fee.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h3>Payment History</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Transaction ID</th>
            <th>Method</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.paymentHistory.length === 0 ? `
            <tr><td colspan="5" style="text-align: center; color: #666;">No payments recorded</td></tr>
          ` : data.paymentHistory.map(payment => `
            <tr>
              <td>${formatDate(payment.confirmedAt || payment.paidAt)}</td>
              <td>${formatCurrency(payment.amount)}</td>
              <td>${payment.transactionId}</td>
              <td>${payment.paymentMethod}</td>
              <td><span class="status-${payment.status.toLowerCase()}">${payment.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>This report was generated electronically by St. Joseph's Academy Fee Management System</p>
        <p>For any queries, please contact the school administration</p>
      </div>
    </body>
    </html>
    `
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Fee Report</DialogTitle>
          <DialogDescription>
            Detailed fee and payment information
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2">Loading report...</p>
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex justify-end gap-2 no-print">
              <Button onClick={printReport} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={downloadPDF} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>

            {/* Student Information */}
            <Card>
              <CardHeader>
                <CardTitle>Student Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Name:</span> {report.student.firstName} {report.student.middleName} {report.student.lastName}</div>
                  <div><span className="font-medium">Admission No:</span> {report.student.admissionNumber}</div>
                  <div><span className="font-medium">Class:</span> {report.student.class}</div>
                  <div><span className="font-medium">Parent:</span> {report.student.parentName}</div>
                  <div><span className="font-medium">Phone:</span> {report.student.parentPhone}</div>
                  <div><span className="font-medium">Email:</span> {report.student.parentEmail || 'N/A'}</div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Due</p>
                    <p className="text-2xl font-bold">{formatCurrency(report.financialSummary.totalDue)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(report.financialSummary.totalPaid)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(report.financialSummary.totalBalance)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fee Assignments */}
            <Card>
              <CardHeader>
                <CardTitle>Fee Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.feeAssignments.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell>{fee.feeStructure.name}</TableCell>
                        <TableCell>{formatCurrency(fee.amountDue)}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(fee.amountPaid)}</TableCell>
                        <TableCell className="text-red-600">{formatCurrency(fee.balance)}</TableCell>
                        <TableCell>{getStatusBadge(fee.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {report.paymentHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No payments recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.paymentHistory.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.confirmedAt || payment.paidAt)}</TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell className="font-mono text-sm">{payment.transactionId}</TableCell>
                          <TableCell>{payment.paymentMethod}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load student report</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}