import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateFeeStructureSchema = z.object({
  name: z.string().min(1, 'Fee name is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  term: z.string().optional(),
  year: z.number().int().min(2020).max(2030),
  dueDate: z.string().optional(),
  isActive: z.boolean().optional(),
})

// GET - Fetch single fee structure
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const feeStructure = await prisma.feeStructure.findUnique({
      where: { id: params.id },
      include: {
        feeAssignments: {
          include: {
            student: true
          }
        }
      }
    })

    if (!feeStructure) {
      return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 })
    }

    return NextResponse.json({ feeStructure })

  } catch (error) {
    console.error('Error fetching fee structure:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update fee structure
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateFeeStructureSchema.parse(body)

    const feeStructure = await prisma.feeStructure.update({
      where: { id: params.id },
      data: {
        name: validatedData.name,
        amount: validatedData.amount,
        term: validatedData.term || null,
        year: validatedData.year,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        isActive: validatedData.isActive,
      }
    })

    return NextResponse.json({ feeStructure })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating fee structure:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete fee structure (only if no assignments)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if fee structure has assignments
    const assignmentCount = await prisma.feeAssignment.count({
      where: { feeStructureId: params.id }
    })

    if (assignmentCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete fee structure with existing assignments' },
        { status: 400 }
      )
    }

    await prisma.feeStructure.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Fee structure deleted successfully' })

  } catch (error) {
    console.error('Error deleting fee structure:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}