import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        feeAssignments: {
          include: {
            feeStructure: true
          },
          orderBy: { createdAt: 'asc' }
        },
        payments: {
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
      student: {
        id: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        class: student.class,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        parentEmail: student.parentEmail,
        dateOfBirth: student.dateOfBirth,
        createdAt: student.createdAt
      },
      financialSummary: {
        totalDue,
        totalPaid,
        totalBalance,
        paymentStatus: totalBalance === 0 ? 'PAID_FULL' : totalBalance < totalDue ? 'PARTIAL' : 'UNPAID'
      },
      feeAssignments: student.feeAssignments.map(assignment => ({
        id: assignment.id,
        feeStructure: {
          name: assignment.feeStructure.name,
          term: assignment.feeStructure.term,
          year: assignment.feeStructure.year,
          dueDate: assignment.feeStructure.dueDate
        },
        amountDue: Number(assignment.amountDue),
        amountPaid: Number(assignment.amountPaid),
        balance: Number(assignment.balance),
        status: assignment.status
      })),
      paymentHistory: student.payments.map(payment => ({
        id: payment.id,
        amount: Number(payment.amount),
        transactionId: payment.transactionId,
        referenceNumber: payment.referenceNumber,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        paidAt: payment.paidAt,
        confirmedAt: payment.confirmedAt,
        receiptSent: payment.receiptSent,
        createdAt: payment.createdAt
      }))
    }

    return NextResponse.json(studentReport)

  } catch (error) {
    console.error('Error generating student report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}