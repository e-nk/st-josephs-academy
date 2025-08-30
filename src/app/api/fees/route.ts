import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createFeeStructureSchema = z.object({
  name: z.string().min(1, 'Fee name is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  term: z.string().optional(),
  year: z.number().int().min(2020).max(2030),
  dueDate: z.string().optional(),
})

// GET - Fetch all fee structures
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const isActive = searchParams.get('active')

    const where: any = {}
    if (year) where.year = parseInt(year)
    if (isActive !== null) where.isActive = isActive === 'true'

    const feeStructures = await prisma.feeStructure.findMany({
      where,
      orderBy: [
        { year: 'desc' },
        { term: 'asc' },
        { createdAt: 'desc' }
      ],
      include: {
        feeAssignments: {
          include: {
            student: {
              select: {
                admissionNumber: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    // Add calculated fields
    const feeStructuresWithStats = feeStructures.map(fee => ({
      ...fee,
      studentsAssigned: fee.feeAssignments.length,
      totalExpected: fee.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.amountDue), 0),
      totalCollected: fee.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.amountPaid), 0),
      totalOutstanding: fee.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.balance), 0)
    }))

    return NextResponse.json({ feeStructures: feeStructuresWithStats })

  } catch (error) {
    console.error('Error fetching fee structures:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new fee structure
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createFeeStructureSchema.parse(body)

    const feeStructure = await prisma.feeStructure.create({
      data: {
        name: validatedData.name,
        amount: validatedData.amount,
        term: validatedData.term || null,
        year: validatedData.year,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
      }
    })

    return NextResponse.json({ feeStructure }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating fee structure:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}