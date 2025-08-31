import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ admissionNumber: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { admissionNumber } = await params

    const student = await prisma.student.findUnique({
      where: { admissionNumber: decodeURIComponent(admissionNumber) },
      include: {
        feeAssignments: {
          include: {
            feeStructure: true
          },
          orderBy: { createdAt: 'asc' }
        },
        payments: {
          where: { status: 'CONFIRMED' },
          orderBy: { confirmedAt: 'desc' }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const totalDue = student.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.amountDue), 0)
    const totalPaid = student.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.amountPaid), 0)
    const totalBalance = student.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.balance), 0)

    const studentReport = {
      id: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      middleName: student.middleName,
      class: student.class,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail,
      totalDue,
      totalPaid,
      totalBalance,
      status: totalBalance === 0 ? 'PAID_FULL' : totalBalance < totalDue ? 'PARTIAL' : 'UNPAID',
      lastPaymentDate: student.payments[0]?.confirmedAt || null,
      feeBreakdown: student.feeAssignments.map(assignment => ({
        feeName: assignment.feeStructure.name,
        amountDue: Number(assignment.amountDue),
        amountPaid: Number(assignment.amountPaid),
        balance: Number(assignment.balance),
        term: assignment.feeStructure.term,
        year: assignment.feeStructure.year,
        dueDate: assignment.feeStructure.dueDate
      })),
      paymentHistory: student.payments.map(payment => ({
        id: payment.id,
        amount: Number(payment.amount),
        transactionId: payment.transactionId,
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt,
        confirmedAt: payment.confirmedAt
      }))
    }

    return NextResponse.json({ student: studentReport })

  } catch (error) {
    console.error('Error fetching student by admission number:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}