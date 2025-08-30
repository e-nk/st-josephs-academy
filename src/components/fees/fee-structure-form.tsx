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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { FeeStructure } from '@/types'

interface FeeStructureFormProps {
  open: boolean
  onClose: () => void
  feeStructure?: FeeStructure | null
  onSuccess: () => void
}

interface FormData {
  name: string
  amount: string
  term: string
  year: string
  dueDate: string
  isActive: boolean
}

const initialFormData: FormData = {
  name: '',
  amount: '',
  term: '',
  year: new Date().getFullYear().toString(),
  dueDate: '',
  isActive: true,
}

const terms = [
  { value: '', label: 'Annual Fee' },
  { value: '1', label: 'Term 1' },
  { value: '2', label: 'Term 2' },
  { value: '3', label: 'Term 3' },
]

export function FeeStructureForm({ open, onClose, feeStructure, onSuccess }: FeeStructureFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = !!feeStructure
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i)

  useEffect(() => {
    if (feeStructure) {
      setFormData({
        name: feeStructure.name,
        amount: feeStructure.amount.toString(),
        term: feeStructure.term || '',
        year: feeStructure.year.toString(),
        dueDate: feeStructure.dueDate 
          ? new Date(feeStructure.dueDate).toISOString().split('T')[0] 
          : '',
        isActive: feeStructure.isActive,
      })
    } else {
      setFormData(initialFormData)
    }
    setErrors({})
  }, [feeStructure, open])

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
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

    if (!formData.name.trim()) {
      newErrors.name = 'Fee name is required'
    }
    
    const amount = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0'
    }
    
    if (!formData.year) {
      newErrors.year = 'Year is required'
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
      const url = isEditing ? `/api/fees/${feeStructure.id}` : '/api/fees'
      const method = isEditing ? 'PUT' : 'POST'
      
      const submitData = {
        name: formData.name.trim(),
        amount: parseFloat(formData.amount),
        term: formData.term || undefined,
        year: parseInt(formData.year),
        dueDate: formData.dueDate || undefined,
        isActive: formData.isActive,
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
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

  // Generate suggested fee names based on term and year
  const generateFeeName = () => {
    const year = formData.year || currentYear.toString()
    const term = formData.term
    
    if (term) {
      return `Term ${term} ${year} Fees`
    } else {
      return `Annual Fees ${year}`
    }
  }

  const handleAutoFillName = () => {
    const suggestedName = generateFeeName()
    handleInputChange('name', suggestedName)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Fee Structure' : 'Create Fee Structure'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update fee structure details below.' 
              : 'Set up a new fee structure for students.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {errors.general}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              Fee Name <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Term 1 2024 Fees"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoFillName}
                className="shrink-0"
              >
                Auto
              </Button>
            </div>
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount (KES) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="50000.00"
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">
                Year <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.year} onValueChange={(value) => handleInputChange('year', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.year && (
                <p className="text-sm text-red-600">{errors.year}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="term">Term</Label>
              <Select value={formData.term} onValueChange={(value) => handleInputChange('term', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term.value} value={term.value}>
                      {term.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(value) => handleInputChange('isActive', value)}
            />
            <Label htmlFor="isActive">Active (students can pay this fee)</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (isEditing ? 'Update Fee Structure' : 'Create Fee Structure')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}