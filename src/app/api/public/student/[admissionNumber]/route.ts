import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Public endpoint to fetch student fee information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ admissionNumber: string }> }
) {
  try {
    const { admissionNumber } = await params // Fix: await params

    if (!admissionNumber) {
      return NextResponse.json({ error: 'Admission number is required' }, { status: 400 })
    }

    // Find student with outstanding fees
    const student = await prisma.student.findUnique({
      where: { admissionNumber },
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        class: true,
        parentName: true,
        parentPhone: true,
        feeAssignments: {
          where: { balance: { gt: 0 } },
          include: {
            feeStructure: {
              select: {
                name: true,
                dueDate: true
              }
            }
          }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Calculate total outstanding and breakdown
    const totalOutstanding = student.feeAssignments.reduce(
      (sum, assignment) => sum + Number(assignment.balance), 
      0
    )

    const feeBreakdown = student.feeAssignments.map(assignment => ({
      feeName: assignment.feeStructure.name,
      balance: Number(assignment.balance),
      dueDate: assignment.feeStructure.dueDate?.toISOString() || null
    }))

    const studentInfo = {
      id: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      class: student.class,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      totalOutstanding,
      feeBreakdown
    }

    return NextResponse.json({ student: studentInfo })

  } catch (error) {
    console.error('Error fetching student information:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}