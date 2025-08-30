'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { FeeStructure, Student } from '@/types'

interface FeeAssignmentProps {
  open: boolean
  onClose: () => void
  feeStructure: FeeStructure | null
  onSuccess: () => void
}

export function FeeAssignment({ open, onClose, feeStructure, onSuccess }: FeeAssignmentProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [customAmount, setCustomAmount] = useState('')
  const [useCustomAmount, setUseCustomAmount] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchingStudents, setFetchingStudents] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const fetchStudents = async (searchTerm = '') => {
    try {
      setFetchingStudents(true)
      const params = new URLSearchParams({
        search: searchTerm,
        limit: '50' // Get more students for assignment
      })
      
      const response = await fetch(`/api/students?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setStudents(data.students)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setFetchingStudents(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchStudents()
      setSelectedStudents([])
      setCustomAmount('')
      setUseCustomAmount(false)
      setError('')
    }
  }, [open])

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchStudents(search)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedStudents.length === 0) {
      setError('Please select at least one student')
      return
    }

    if (useCustomAmount) {
      const amount = parseFloat(customAmount)
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid custom amount')
        return
      }
    }

    if (!feeStructure) {
      setError('Fee structure not found')
      return
    }

    setLoading(true)
    setError('')

    try {
      const submitData = {
        studentIds: selectedStudents,
        ...(useCustomAmount && { customAmount: parseFloat(customAmount) })
      }

      const response = await fetch(`/api/fees/${feeStructure.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess()
        onClose()
        // Show success message
        alert(`${data.message}${data.skipped > 0 ? ` (${data.skipped} students already had this fee assigned)` : ''}`)
      } else {
        setError(data.error || 'An error occurred while assigning fees')
      }
    } catch (error) {
      console.error('Error assigning fees:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!feeStructure) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Assign Fee to Students</DialogTitle>
          <DialogDescription>
            Assign "{feeStructure.name}" ({formatCurrency(feeStructure.amount)}) to selected students
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          {/* Custom Amount Option */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
								id="useCustomAmount"
								checked={useCustomAmount}
								onCheckedChange={(checked) => setUseCustomAmount(checked as boolean)}
							/>
              <Label htmlFor="useCustomAmount">Use custom amount (different from default)</Label>
            </div>
            
            {useCustomAmount && (
              <div className="space-y-2">
                <Label htmlFor="customAmount">Custom Amount (KES)</Label>
                <Input
                  id="customAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder={feeStructure.amount.toString()}
                />
              </div>
            )}
          </div>

          {/* Student Search */}
          <div className="space-y-2">
            <Label>Search and Select Students</Label>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button type="submit" variant="outline" disabled={fetchingStudents}>
                {fetchingStudents ? 'Searching...' : 'Search'}
              </Button>
            </form>
          </div>

          {/* Students Table */}
          <div className="border rounded-md max-h-80 overflow-y-auto">
            {fetchingStudents ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm">Loading students...</p>
                </div>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No students found</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-white">
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedStudents.length === students.length && students.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all students"
                      />
                    </TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Parent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={(checked) => handleStudentSelect(student.id, checked as boolean)}
                          aria-label={`Select ${student.firstName} ${student.lastName}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {student.admissionNumber}
                      </TableCell>
                      <TableCell>
                        {student.firstName} {student.middleName} {student.lastName}
                      </TableCell>
                      <TableCell>{student.class}</TableCell>
                      <TableCell>{student.parentName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Selection Summary */}
          {selectedStudents.length > 0 && (
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm">
                <strong>{selectedStudents.length} students selected</strong>
                <br />
                Amount per student: {formatCurrency(
                  useCustomAmount && customAmount ? parseFloat(customAmount) : feeStructure.amount
                )}
                <br />
                Total: {formatCurrency(
                  (useCustomAmount && customAmount ? parseFloat(customAmount) : feeStructure.amount) * selectedStudents.length
                )}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || selectedStudents.length === 0}>
              {loading ? 'Assigning...' : `Assign Fee to ${selectedStudents.length} Students`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}