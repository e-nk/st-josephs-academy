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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Student } from '@/types'

interface StudentFormProps {
  open: boolean
  onClose: () => void
  student?: Student | null
  onSuccess: () => void
}

interface FormData {
  admissionNumber: string
  firstName: string
  lastName: string
  middleName: string
  class: string
  parentName: string
  parentPhone: string
  parentEmail: string
  dateOfBirth: string
}

const initialFormData: FormData = {
  admissionNumber: '',
  firstName: '',
  lastName: '',
  middleName: '',
  class: '',
  parentName: '',
  parentPhone: '',
  parentEmail: '',
  dateOfBirth: '',
}

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

export function StudentForm({ open, onClose, student, onSuccess }: StudentFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = !!student

  useEffect(() => {
    if (student) {
      setFormData({
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName || '',
        class: student.class,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        parentEmail: student.parentEmail || '',
        dateOfBirth: student.dateOfBirth 
          ? new Date(student.dateOfBirth).toISOString().split('T')[0] 
          : '',
      })
    } else {
      setFormData(initialFormData)
    }
    setErrors({})
  }, [student, open])

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.admissionNumber.trim()) {
      newErrors.admissionNumber = 'Admission number is required'
    }
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }
    if (!formData.class) {
      newErrors.class = 'Class is required'
    }
    if (!formData.parentName.trim()) {
      newErrors.parentName = 'Parent name is required'
    }
    if (!formData.parentPhone.trim()) {
      newErrors.parentPhone = 'Parent phone is required'
    }
    if (formData.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentEmail)) {
      newErrors.parentEmail = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const url = isEditing ? `/api/students/${student.id}` : '/api/students'
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        if (data.details) {
          // Handle Zod validation errors
          const fieldErrors: Record<string, string> = {}
          data.details.forEach((error: any) => {
            if (error.path && error.path.length > 0) {
              fieldErrors[error.path[0]] = error.message
            }
          })
          setErrors(fieldErrors)
        } else {
          setErrors({ general: data.error || 'An error occurred' })
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      setErrors({ general: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Student' : 'Add New Student'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update student information below.' 
              : 'Enter the student details to register them in the system.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="admissionNumber">
                Admission Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="admissionNumber"
                value={formData.admissionNumber}
                onChange={(e) => handleInputChange('admissionNumber', e.target.value)}
                disabled={isEditing} // Can't change admission number when editing
                placeholder="e.g., 2024001"
              />
              {errors.admissionNumber && (
                <p className="text-sm text-red-600">{errors.admissionNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">
                Class <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.class} onValueChange={(value) => handleInputChange('class', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.class && (
                <p className="text-sm text-red-600">{errors.class}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="John"
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                id="middleName"
                value={formData.middleName}
                onChange={(e) => handleInputChange('middleName', e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Doe"
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parentName">
                Parent/Guardian Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="parentName"
                value={formData.parentName}
                onChange={(e) => handleInputChange('parentName', e.target.value)}
                placeholder="Jane Doe"
              />
              {errors.parentName && (
                <p className="text-sm text-red-600">{errors.parentName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentPhone">
                Parent Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="parentPhone"
                value={formData.parentPhone}
                onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                placeholder="0722123456"
              />
              {errors.parentPhone && (
                <p className="text-sm text-red-600">{errors.parentPhone}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentEmail">Parent Email (Optional)</Label>
            <Input
              id="parentEmail"
              type="email"
              value={formData.parentEmail}
              onChange={(e) => handleInputChange('parentEmail', e.target.value)}
              placeholder="parent@email.com"
            />
            {errors.parentEmail && (
              <p className="text-sm text-red-600">{errors.parentEmail}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (isEditing ? 'Update Student' : 'Add Student')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}