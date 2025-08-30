'use client'

import { useState } from 'react'
import { FeeStructureList } from '@/components/fees/fee-structure-list'
import { FeeStructureForm } from '@/components/fees/fee-structure-form'
import { FeeAssignment } from '@/components/fees/fee-assignment'
import { FeeStructure } from '@/types'

export default function FeesPage() {
  const [showForm, setShowForm] = useState(false)
  const [showAssignment, setShowAssignment] = useState(false)
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null)
  const [assigningFee, setAssigningFee] = useState<FeeStructure | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleAddFee = () => {
    setEditingFee(null)
    setShowForm(true)
  }

  const handleEditFee = (fee: FeeStructure) => {
    setEditingFee(fee)
    setShowForm(true)
  }

  const handleAssignFee = (fee: FeeStructure) => {
    setAssigningFee(fee)
    setShowAssignment(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingFee(null)
  }

  const handleAssignmentClose = () => {
    setShowAssignment(false)
    setAssigningFee(null)
  }

  const handleFormSuccess = () => {
    // Refresh the fee structures list
    setRefreshKey(prev => prev + 1)
  }

  const handleAssignmentSuccess = () => {
    // Refresh the fee structures list to update assignment counts
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Fee Structures</h2>
        <p className="text-muted-foreground">
          Create and manage school fees for different terms and years
        </p>
      </div>

      <FeeStructureList
        key={refreshKey} // Force re-render when refreshKey changes
        onAddFee={handleAddFee}
        onEditFee={handleEditFee}
        onAssignFee={handleAssignFee}
      />

      <FeeStructureForm
        open={showForm}
        onClose={handleFormClose}
        feeStructure={editingFee}
        onSuccess={handleFormSuccess}
      />

      <FeeAssignment
        open={showAssignment}
        onClose={handleAssignmentClose}
        feeStructure={assigningFee}
        onSuccess={handleAssignmentSuccess}
      />
    </div>
  )
}