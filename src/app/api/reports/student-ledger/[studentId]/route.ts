import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { studentLedgerService } from '@/lib/student-ledger'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentId } = await params
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    // Get student basic info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        middleName: true,
        class: true,
        parentName: true,
        parentPhone: true,
        parentEmail: true,
        currentAcademicYear: true
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Get complete ledger history
    const ledgerData = await studentLedgerService.getStudentLedger(studentId, limit)

    // Get current fee assignments and credits for additional context
    const [currentFeeAssignments, activeCredits] = await Promise.all([
      prisma.feeAssignment.findMany({
        where: { studentId },
        include: {
          feeStructure: {
            select: {
              name: true,
              term: true,
              year: true,
              dueDate: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      // @ts-ignore - Prisma type issue
      prisma.studentCredit.findMany({
        where: {
          studentId,
          isActive: true,
          remainingAmount: { gt: 0 }
        },
        orderBy: { createdAt: 'desc' }
      })
    ])

    const response = {
      student,
      ledger: ledgerData,
      currentAssignments: currentFeeAssignments.map(assignment => ({
        id: assignment.id,
        feeName: assignment.feeStructure.name,
        term: assignment.feeStructure.term,
        year: assignment.feeStructure.year,
        amountDue: Number(assignment.amountDue),
        amountPaid: Number(assignment.amountPaid),
        balance: Number(assignment.balance),
        status: assignment.status,
        dueDate: assignment.feeStructure.dueDate
      })),
      activeCredits: activeCredits.map((credit: any) => ({
        id: credit.id,
        amount: Number(credit.amount),
        remainingAmount: Number(credit.remainingAmount),
        source: credit.source,
        createdAt: credit.createdAt
      }))
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching student ledger:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}