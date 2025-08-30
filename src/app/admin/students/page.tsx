'use client'

import { useState } from 'react'
import { StudentList } from '@/components/students/student-list'
import { StudentForm } from '@/components/students/student-form'
import { Student } from '@/types'

export default function StudentsPage() {
  const [showForm, setShowForm] = useState(false)
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

  const handleFormClose = () => {
    setShowForm(false)
    setEditingStudent(null)
  }

  const handleFormSuccess = () => {
    // Refresh the student list
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Students</h2>
        <p className="text-muted-foreground">
          Manage student registrations and information
        </p>
      </div>

      <StudentList
        key={refreshKey} // Force re-render when refreshKey changes
        onAddStudent={handleAddStudent}
        onEditStudent={handleEditStudent}
      />

      <StudentForm
        open={showForm}
        onClose={handleFormClose}
        student={editingStudent}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}