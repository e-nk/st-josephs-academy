'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload } from 'lucide-react'
import { Student } from '@/types'

interface StudentListProps {
  onAddStudent: () => void
  onEditStudent: (student: Student) => void
  onBulkImport: () => void
}

interface StudentsResponse {
  students: Student[]
  pagination: {
    total: number
    pages: number
    current: number
    limit: number
  }
}

export function StudentList({ onAddStudent, onEditStudent, onBulkImport }: StudentListProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    current: 1,
    limit: 10
  })

  const fetchStudents = async (searchTerm = '', page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        search: searchTerm,
        page: page.toString(),
        limit: '10'
      })
      
      const response = await fetch(`/api/students?${params}`)
      const data: StudentsResponse = await response.json()
      
      if (response.ok) {
        setStudents(data.students)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchStudents(search, 1)
  }

  const handlePageChange = (page: number) => {
    fetchStudents(search, page)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2">Loading students...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Students</CardTitle>
						<CardDescription>
							Manage student registrations and information
						</CardDescription>
					</div>
					<div className="flex gap-2">
						<Button onClick={onBulkImport} variant="outline">
							<Upload className="h-4 w-4 mr-2" />
							Bulk Import
						</Button>
						<Button onClick={onAddStudent}>Add Student</Button>
					</div>
				</div>
			</CardHeader>
      <CardContent>
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Button type="submit" variant="outline">Search</Button>
          {search && (
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => {
                setSearch('')
                fetchStudents('', 1)
              }}
            >
              Clear
            </Button>
          )}
        </form>

        {/* Students Table */}
        {students.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No students found</p>
            <Button onClick={onAddStudent} className="mt-4">
              Add Your First Student
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.admissionNumber}
                      </TableCell>
                      <TableCell>
                        {student.firstName} {student.middleName} {student.lastName}
                      </TableCell>
                      <TableCell>{student.class}</TableCell>
                      <TableCell>{student.parentName}</TableCell>
                      <TableCell>{student.parentPhone}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditStudent(student)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((pagination.current - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.current * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} students
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.current - 1)}
                    disabled={pagination.current === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.current + 1)}
                    disabled={pagination.current === pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}