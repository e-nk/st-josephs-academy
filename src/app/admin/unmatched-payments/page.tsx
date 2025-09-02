'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, CheckCircle, Clock, Search } from 'lucide-react'

interface UnmatchedPayment {
  id: string
  amount: number
  transactionId: string
  accountReference: string
  phoneNumber: string | null
  payerName: string | null
  transactionDate: string
  status: 'PENDING' | 'RESOLVED' | 'REJECTED'
  adminNotes: string | null
  createdAt: string
}

interface Student {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  class: string
}

export default function UnmatchedPaymentsPage() {
  const [unmatchedPayments, setUnmatchedPayments] = useState<UnmatchedPayment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<UnmatchedPayment | null>(null)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    fetchUnmatchedPayments()
    fetchStudents()
  }, [])

  const fetchUnmatchedPayments = async () => {
    try {
      const response = await fetch('/api/admin/unmatched-payments')
      const data = await response.json()
      if (response.ok) {
        setUnmatchedPayments(data.payments)
      }
    } catch (error) {
      console.error('Error fetching unmatched payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async (search: string = '') => {
    try {
      const params = new URLSearchParams({ search, limit: '50' })
      const response = await fetch(`/api/students?${params}`)
      const data = await response.json()
      if (response.ok) {
        setStudents(data.students)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const handleResolvePayment = (payment: UnmatchedPayment) => {
    setSelectedPayment(payment)
    setSelectedStudent('')
    setAdminNotes('')
    setStudentSearch('')
  }

  const handleRejectPayment = async (payment: UnmatchedPayment) => {
    if (!confirm('Are you sure you want to reject this payment? This action cannot be undone.')) {
      return
    }

    try {
      setResolving(true)
      const response = await fetch(`/api/admin/unmatched-payments/${payment.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminNotes: `Payment rejected - ${new Date().toISOString()}`
        })
      })

      if (response.ok) {
        await fetchUnmatchedPayments()
        alert('Payment rejected successfully')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to reject payment')
      }
    } catch (error) {
      alert('Error rejecting payment')
    } finally {
      setResolving(false)
    }
  }

  const handleConfirmResolution = async () => {
    if (!selectedStudent || !selectedPayment) {
      alert('Please select a student')
      return
    }

    try {
      setResolving(true)
      const response = await fetch(`/api/admin/unmatched-payments/${selectedPayment.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent,
          adminNotes
        })
      })

      if (response.ok) {
        await fetchUnmatchedPayments()
        setSelectedPayment(null)
        alert('Payment resolved successfully')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to resolve payment')
      }
    } catch (error) {
      alert('Error resolving payment')
    } finally {
      setResolving(false)
    }
  }

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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'RESOLVED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>
      case 'REJECTED':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredStudents = students.filter(student => 
    student.admissionNumber.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.firstName.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.lastName.toLowerCase().includes(studentSearch.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Unmatched Payments</h2>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Unmatched Payments</h2>
        <p className="text-muted-foreground">
          Payments that could not be automatically matched to students
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-orange-600">
                  {unmatchedPayments.filter(p => p.status === 'PENDING').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-green-600">
                  {unmatchedPayments.filter(p => p.status === 'RESOLVED').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold">
                  {formatCurrency(unmatchedPayments.reduce((sum, p) => sum + p.amount, 0))}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unmatched Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Unmatched Payments</CardTitle>
          <CardDescription>
            Payments that need manual review and resolution
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unmatchedPayments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No unmatched payments found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reference Used</TableHead>
                  <TableHead>Payer Details</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unmatchedPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.transactionDate)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm bg-red-50 text-red-700 px-2 py-1 rounded">
                        {payment.accountReference}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.payerName || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{payment.phoneNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{payment.transactionId}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>
                      {payment.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleResolvePayment(payment)}
                          >
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectPayment(payment)}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      {payment.adminNotes && (
                        <div className="text-xs text-muted-foreground mt-1" title={payment.adminNotes}>
                          {payment.adminNotes.substring(0, 50)}...
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resolution Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Resolve Payment</DialogTitle>
            <DialogDescription>
              Match this payment to the correct student
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              {/* Payment Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Payment Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Amount: {formatCurrency(selectedPayment.amount)}</div>
                  <div>Transaction: {selectedPayment.transactionId}</div>
                  <div>Reference Used: <span className="text-red-600">{selectedPayment.accountReference}</span></div>
                  <div>Payer: {selectedPayment.payerName}</div>
                  <div>Date: {formatDate(selectedPayment.transactionDate)}</div>
                  <div>Phone: {selectedPayment.phoneNumber}</div>
                </div>
              </div>

              {/* Student Search */}
              <div className="space-y-2">
                <Label>Search and Select Student</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by admission number or name..."
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value)
                      fetchStudents(e.target.value)
                    }}
                  />
                  <Button variant="outline" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Student Selection */}
              <div className="space-y-2">
                <Label>Select Correct Student</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose the correct student" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.admissionNumber} - {student.firstName} {student.lastName} ({student.class})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label>Resolution Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this resolution..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPayment(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmResolution} disabled={!selectedStudent || resolving}>
              {resolving ? 'Resolving...' : 'Resolve Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}