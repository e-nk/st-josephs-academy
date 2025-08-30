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
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FeeStructure } from '@/types'

interface FeeStructureListProps {
  onAddFee: () => void
  onEditFee: (fee: FeeStructure) => void
  onAssignFee: (fee: FeeStructure) => void
}

export function FeeStructureList({ onAddFee, onEditFee, onAssignFee }: FeeStructureListProps) {
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<string>('all')

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  const fetchFeeStructures = async (year?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (year && year !== 'all') {
        params.set('year', year)
      }
      
      const response = await fetch(`/api/fees?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setFeeStructures(data.feeStructures)
      }
    } catch (error) {
      console.error('Error fetching fee structures:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeeStructures(selectedYear)
  }, [selectedYear])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  const formatDate = (date?: Date) => {
    if (!date) return 'No due date'
    return new Date(date).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2">Loading fee structures...</p>
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
            <CardTitle>Fee Structures</CardTitle>
            <CardDescription>
              Manage school fees for different terms and years
            </CardDescription>
          </div>
          <Button onClick={onAddFee}>Create Fee Structure</Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Year:</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Fee Structures Table */}
        {feeStructures.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No fee structures found</p>
            <Button onClick={onAddFee} className="mt-4">
              Create Your First Fee Structure
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Term/Year</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeStructures.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-medium">{fee.name}</TableCell>
                    <TableCell>{formatCurrency(fee.amount)}</TableCell>
                    <TableCell>
                      {fee.term ? `Term ${fee.term}` : 'Annual'} {fee.year}
                    </TableCell>
                    <TableCell>{formatDate(fee.dueDate)}</TableCell>
                    <TableCell>
                      <div className="text-center">
                        <span className="font-medium">{fee.studentsAssigned || 0}</span>
                        <br />
                        <span className="text-xs text-muted-foreground">assigned</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="text-green-600 font-medium">
                          {formatCurrency(fee.totalCollected || 0)}
                        </div>
                        <div className="text-red-600">
                          {formatCurrency(fee.totalOutstanding || 0)} pending
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={fee.isActive ? 'default' : 'secondary'}>
                        {fee.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditFee(fee)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAssignFee(fee)}
                        >
                          Assign
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}