'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Download, FileSpreadsheet, Users, DollarSign, Search, File, UserCheck, GraduationCap, ArrowRight } from 'lucide-react'
import { StudentReport } from '@/components/reports/student-report'
import { generateClassReportPDF } from '@/lib/pdf-export'
import { ArrearsReport } from '@/components/reports/arrears-report'
import { AnnualReport } from '@/components/reports/annual-report'
import { NonActiveStudents } from '@/components/reports/non-active-students'


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
    activeStudents: number
    graduatedStudents: number
    transferredStudents: number
    withdrawnStudents: number
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
    status: string // Add this
    graduationYear?: number // Add this
    paymentStatus: string
    lastPaymentDate: string | null
    notes?: string // Add this
  }>
}

interface StudentData {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  middleName: string
  class: string
  parentName: string
  totalDue: number
  totalPaid: number
  totalBalance: number
  status: string
  lastPaymentDate: string | null
}

export default function ReportsPage() {
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [classReport, setClassReport] = useState<ClassReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [showStudentReport, setShowStudentReport] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  
  // Student lookup states
  const [admissionNumber, setAdmissionNumber] = useState('')
  const [lookupStudent, setLookupStudent] = useState<StudentData | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')

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

  const fetchStudentByAdmission = async () => {
    if (!admissionNumber.trim()) {
      setLookupError('Please enter an admission number')
      return
    }

    setLookupLoading(true)
    setLookupError('')
    setLookupStudent(null)

    try {
      const response = await fetch(`/api/reports/student-by-admission/${encodeURIComponent(admissionNumber)}`)
      const data = await response.json()
      
      if (response.ok) {
        setLookupStudent(data.student)
      } else {
        setLookupError(data.error || 'Student not found')
      }
    } catch (error) {
      setLookupError('Error searching for student')
    } finally {
      setLookupLoading(false)
    }
  }

  const handleClassSelect = (className: string) => {
    setSelectedClass(className)
    fetchClassReport(className)
  }

  const handleStudentReport = (studentId: string) => {
    setSelectedStudentId(studentId)
    setShowStudentReport(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

 const getPaymentStatusBadge = (status: string) => {
		switch (status) {
			case 'PAID_FULL':
				return <Badge className="bg-green-100 text-green-800">Paid Full</Badge>
			case 'OVERPAID':
				return <Badge className="bg-purple-100 text-purple-800">Has Credit</Badge>
			case 'PARTIAL':
				return <Badge variant="secondary">Partial</Badge>
			case 'UNPAID':
				return <Badge variant="destructive">Unpaid</Badge>
			default:
				return <Badge variant="outline">{status}</Badge>
		}
	}


		const getStudentStatusBadge = (status: string, graduationYear?: number) => {
			switch (status) {
				case 'ACTIVE':
					return <Badge className="bg-blue-100 text-blue-800">Active</Badge>
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

  const exportToPDF = () => {
    if (!classReport) return

    const htmlContent = generateClassReportPDF(classReport)
    
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Fee Reports</h2>
        <p className="text-muted-foreground">
          Generate and download detailed fee reports by class or individual student
        </p>
      </div>

      {/* Student Lookup Section */}
      <Card>
        <CardHeader>
          <CardTitle>Student Lookup</CardTitle>
          <CardDescription>
            Search for an individual student by admission number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="admission">Admission Number</Label>
              <Input
                id="admission"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                placeholder="Enter admission number (e.g., 2024001)"
                onKeyPress={(e) => e.key === 'Enter' && fetchStudentByAdmission()}
              />
            </div>
            <Button onClick={fetchStudentByAdmission} disabled={lookupLoading} className="mt-auto">
              <Search className="h-4 w-4 mr-2" />
              {lookupLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {lookupError && (
            <div className="text-red-600 text-sm mb-4">{lookupError}</div>
          )}

          {lookupStudent && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">
                    {lookupStudent.firstName} {lookupStudent.middleName} {lookupStudent.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {lookupStudent.admissionNumber} • {lookupStudent.class} • {lookupStudent.parentName}
                  </p>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span>Due: {formatCurrency(lookupStudent.totalDue)}</span>
                    <span className="text-green-600">Paid: {formatCurrency(lookupStudent.totalPaid)}</span>
                    <span className="text-red-600">Balance: {formatCurrency(lookupStudent.totalBalance)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {getStudentStatusBadge(lookupStudent.status)}
                  <Button
                    size="sm"
                    onClick={() => handleStudentReport(lookupStudent.id)}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    Full Report
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class Reports Section */}
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

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2">Loading report...</p>
            </div>
          )}

          {classReport && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-6"> {/* Changed from 4 to 6 columns */}
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
										<p className="text-sm text-muted-foreground">Active</p>
										<p className="text-2xl font-bold text-blue-600">{classReport.summary.activeStudents}</p>
									</div>
									<UserCheck className="h-8 w-8 text-blue-500" />
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-muted-foreground">Graduated</p>
										<p className="text-2xl font-bold text-purple-600">{classReport.summary.graduatedStudents}</p>
									</div>
									<GraduationCap className="h-8 w-8 text-purple-500" />
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-muted-foreground">Transferred</p>
										<p className="text-2xl font-bold text-yellow-600">{classReport.summary.transferredStudents}</p>
									</div>
									<ArrowRight className="h-8 w-8 text-yellow-500" />
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
											<TableHead>Student Status</TableHead> {/* Add this column */}
											<TableHead>Total Due</TableHead>
											<TableHead>Paid</TableHead>
											<TableHead>Balance</TableHead>
											<TableHead>Payment Status</TableHead> {/* Rename this for clarity */}
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
													{student.notes && (
														<div className="text-xs text-muted-foreground truncate max-w-32" title={student.notes}>
															{student.notes}
														</div>
													)}
												</TableCell>
												<TableCell>
													{getStudentStatusBadge(student.status, student.graduationYear)}
												</TableCell>
												<TableCell>{formatCurrency(student.totalDue)}</TableCell>
												<TableCell className="text-green-600">
													{formatCurrency(student.totalPaid)}
												</TableCell>
												<TableCell className="text-red-600">
													{formatCurrency(student.totalBalance)}
												</TableCell>
												<TableCell>
													{getPaymentStatusBadge(student.paymentStatus)}
												</TableCell>
												<TableCell>
													<Button 
														variant="outline" 
														size="sm"
														onClick={() => handleStudentReport(student.id)}
													>
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

      <StudentReport
        open={showStudentReport}
        onClose={() => setShowStudentReport(false)}
        studentId={selectedStudentId}
      />

			{/* Arrears Report Section */}
			<ArrearsReport />

			{/* Annual Report Section */}
			<AnnualReport />

			{/* Non-Active Students Section */}
			<NonActiveStudents />
    </div>
  )
}