'use client'

import { useState } from 'react'
import { StudentList } from '@/components/students/student-list'
import { StudentForm } from '@/components/students/student-form'
import { BulkImport } from '@/components/students/bulk-import'
import { StudentManagement } from '@/components/students/student-management'
import { Student } from '@/types'
import { GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function StudentsPage() {
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [showManagement, setShowManagement] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleAddStudent = () => {
    setEditingStudent(null)
    setShowForm(true)
  }

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student)
    setShowForm(true)
  }

  const handleBulkImport = () => {
    setShowBulkImport(true)
  }

  const handleManagement = () => {
    setShowManagement(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingStudent(null)
  }

  const handleBulkImportClose = () => {
    setShowBulkImport(false)
  }

  const handleManagementClose = () => {
    setShowManagement(false)
  }

  const handleFormSuccess = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleBulkImportSuccess = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleManagementSuccess = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Students</h2>
          <p className="text-muted-foreground">
            Manage student registrations and information
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleManagement} variant="outline">
            <GraduationCap className="h-4 w-4 mr-2" />
            Manage Students
          </Button>
        </div>
      </div>

      <StudentList
        key={refreshKey}
        onAddStudent={handleAddStudent}
        onEditStudent={handleEditStudent}
        onBulkImport={handleBulkImport}
      />

      <StudentForm
        open={showForm}
        onClose={handleFormClose}
        student={editingStudent}
        onSuccess={handleFormSuccess}
      />

      <BulkImport
        open={showBulkImport}
        onClose={handleBulkImportClose}
        onSuccess={handleBulkImportSuccess}
      />

      <StudentManagement
        open={showManagement}
        onClose={handleManagementClose}
        onSuccess={handleManagementSuccess}
      />
    </div>
  )
}