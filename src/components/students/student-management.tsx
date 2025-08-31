'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
import { GraduationCap, UserCheck, UserX, ArrowRight } from 'lucide-react'
import { Student } from '@/types'

const classes = [
  'Baby Class', 'PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 
  'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'
]

interface StudentManagementProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ExtendedStudent extends Student {
  status: 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'WITHDRAWN'
  graduationYear?: number
  currentAcademicYear: number
  notes?: string
  totalBalance: number
}

export function StudentManagement({ open, onClose, onSuccess }: StudentManagementProps) {
  const [students, setStudents] = useState<ExtendedStudent[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ACTIVE')
  const [classFilter, setClassFilter] = useState('ALL_CLASSES')
  
  // Form fields
  const [newClass, setNewClass] = useState('KEEP_CURRENT')  // Instead of ''
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'WITHDRAWN'>('ACTIVE')
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear())
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      fetchStudents()
    }
  }, [open, statusFilter, classFilter])

  const fetchStudents = async () => {
		setLoading(true)
		try {
			const params = new URLSearchParams()
			if (statusFilter) params.set('status', statusFilter)
			if (classFilter && classFilter !== 'ALL_CLASSES') params.set('class', classFilter)  // Add this check
			
			const response = await fetch(`/api/students/management?${params}`)
			const data = await response.json()
			
			if (response.ok) {
				setStudents(data.students)
			}
		} catch (error) {
			console.error('Error fetching students:', error)
		} finally {
			setLoading(false)
		}
	}

  const handleStudentSelect = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId])
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(students.map(s => s.id))
    } else {
      setSelectedStudents([])
    }
  }

  const handlePromoteStudents = async () => {
    if (selectedStudents.length === 0) return

    setProcessing(true)
    try {
      const response = await fetch('/api/students/promotion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds: selectedStudents,
          newClass: newClass !== 'KEEP_CURRENT' ? newClass : undefined,
          newStatus,
          academicYear,
          notes: notes || undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess()
        setSelectedStudents([])
        fetchStudents()
        alert(data.message)
      } else {
        alert(data.error || 'Failed to update students')
      }
    } catch (error) {
      alert('Error updating students')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'GRADUATED':
        return <Badge className="bg-blue-100 text-blue-800">Graduated</Badge>
      case 'TRANSFERRED':
        return <Badge className="bg-yellow-100 text-yellow-800">Transferred</Badge>
      case 'WITHDRAWN':
        return <Badge variant="destructive">Withdrawn</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Student Lifecycle Management
          </DialogTitle>
          <DialogDescription>
            Manage student promotions, graduations, and status changes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="GRADUATED">Graduated</SelectItem>
                      <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                      <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="class-filter">Class</Label>
                  <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All classes" />
                    </SelectTrigger>
                    <SelectContent>
											<SelectItem value="ALL_CLASSES">All Classes</SelectItem>
											{classes.map((cls) => (
												<SelectItem key={cls} value={cls}>{cls}</SelectItem>
											))}
										</SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Form */}
          {selectedStudents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Update Selected Students ({selectedStudents.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new-status">New Status</Label>
                    <Select value={newStatus} onValueChange={(value: any) => setNewStatus(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="GRADUATED">Graduated</SelectItem>
                        <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                        <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="new-class">New Class (Optional)</Label>
                    <Select value={newClass} onValueChange={setNewClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Keep current class" />
                      </SelectTrigger>
                      <SelectContent>
												<SelectItem value="KEEP_CURRENT">Keep Current Class</SelectItem>  // Instead of empty string
												{classes.map((cls) => (
													<SelectItem key={cls} value={cls}>{cls}</SelectItem>
												))}
											</SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="academic-year">Academic Year</Label>
                    <Input
                      type="number"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Reason for change..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <Button onClick={handlePromoteStudents} disabled={processing}>
                    {processing ? 'Processing...' : 'Update Students'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Students Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Students ({students.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2">Loading students...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedStudents.length === students.length && students.length > 0}
                          onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        />
                      </TableHead>
                      <TableHead>Admission No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={(checked) => handleStudentSelect(student.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{student.admissionNumber}</TableCell>
                        <TableCell>{student.firstName} {student.lastName}</TableCell>
                        <TableCell>{student.class}</TableCell>
                        <TableCell>{getStatusBadge(student.status)}</TableCell>
                        <TableCell className={student.totalBalance > 0 ? "text-red-600" : "text-green-600"}>
                          {formatCurrency(student.totalBalance)}
                        </TableCell>
                        <TableCell>{student.currentAcademicYear}</TableCell>
                        <TableCell className="max-w-32 truncate" title={student.notes}>
                          {student.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}