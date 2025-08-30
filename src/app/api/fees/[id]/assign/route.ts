import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const assignFeeSchema = z.object({
  studentIds: z.array(z.string()).min(1, 'At least one student must be selected'),
  customAmount: z.number().positive().optional(),
})

// POST - Assign fee to students
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = assignFeeSchema.parse(body)

    // Get fee structure
    const feeStructure = await prisma.feeStructure.findUnique({
      where: { id: params.id }
    })

    if (!feeStructure) {
      return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 })
    }

    // Check which students already have this fee assigned
    const existingAssignments = await prisma.feeAssignment.findMany({
      where: {
        feeStructureId: params.id,
        studentId: { in: validatedData.studentIds }
      }
    })

    const existingStudentIds = existingAssignments.map(a => a.studentId)
    const newStudentIds = validatedData.studentIds.filter(id => !existingStudentIds.includes(id))

    if (newStudentIds.length === 0) {
      return NextResponse.json(
        { error: 'All selected students already have this fee assigned' },
        { status: 400 }
      )
    }

    // Create new assignments
    const amount = validatedData.customAmount || Number(feeStructure.amount)
    
    const assignments = await Promise.all(
      newStudentIds.map(studentId =>
        prisma.feeAssignment.create({
          data: {
            studentId,
            feeStructureId: params.id,
            amountDue: amount,
            balance: amount,
          },
          include: {
            student: {
              select: {
                admissionNumber: true,
                firstName: true,
                lastName: true
              }
            }
          }
        })
      )
    )

    return NextResponse.json({
      message: `Fee assigned to ${assignments.length} students`,
      assignments,
      skipped: existingStudentIds.length
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error assigning fee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}