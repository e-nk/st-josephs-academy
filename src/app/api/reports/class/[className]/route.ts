import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ className: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { className } = await params

    const students = await prisma.student.findMany({
      where: { class: decodeURIComponent(className), status: 'ACTIVE'  },
      include: {
        feeAssignments: {
          include: {
            feeStructure: {
              select: {
                name: true,
                amount: true,
                term: true,
                year: true,
                dueDate: true
              }
            }
          }
        },
        // @ts-ignore - Prisma type issue
        credits: {
          where: { isActive: true, remainingAmount: { gt: 0 } }
        },
        payments: {
          where: { status: 'CONFIRMED' },
          orderBy: { confirmedAt: 'desc' }
        }
      },
      orderBy: [
        { status: 'asc' }, // Show ACTIVE first, then others
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    })

    const classReport = students.map(student => {
      const totalDue = student.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.amountDue), 0)
      const totalPaid = student.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.amountPaid), 0)
      const totalOutstanding = student.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.balance), 0)
      const totalCredits = student.credits.reduce((sum: number, credit: any) => sum + Number(credit.remainingAmount), 0)
      const netBalance = totalOutstanding - totalCredits
      
      // Determine payment status based on net balance
      let paymentStatus = 'UNPAID'
      if (netBalance === 0) paymentStatus = 'PAID_FULL'
      else if (netBalance < 0) paymentStatus = 'OVERPAID' // Has credit
      else if (totalPaid > 0) paymentStatus = 'PARTIAL'
      
      return {
        id: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        class: student.class,
        status: student.status,
        graduationYear: student.graduationYear,
        currentAcademicYear: student.currentAcademicYear,
        notes: student.notes,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        parentEmail: student.parentEmail,
        totalDue,
        totalPaid,
        totalBalance: Math.max(0, totalOutstanding), // Outstanding fees only
        totalCredits, // Available credits
        netBalance, // Net position (negative = has credit)
        paymentStatus,
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
        creditBreakdown: student.credits.map((credit: any) => ({
          amount: Number(credit.remainingAmount),
          source: credit.source,
          createdAt: credit.createdAt
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
    })

    // Update summary to include status breakdown
    const summary = {
      totalStudents: students.length,
      activeStudents: classReport.filter(s => s.status === 'ACTIVE').length,
      graduatedStudents: classReport.filter(s => s.status === 'GRADUATED').length,
      transferredStudents: classReport.filter(s => s.status === 'TRANSFERRED').length,
      withdrawnStudents: classReport.filter(s => s.status === 'WITHDRAWN').length,
      paidInFull: classReport.filter(s => s.paymentStatus === 'PAID_FULL').length,
      partialPayment: classReport.filter(s => s.paymentStatus === 'PARTIAL').length,
      unpaid: classReport.filter(s => s.paymentStatus === 'UNPAID').length,
      totalDue: classReport.reduce((sum, s) => sum + s.totalDue, 0),
      totalCollected: classReport.reduce((sum, s) => sum + s.totalPaid, 0),
      totalOutstanding: classReport.reduce((sum, s) => sum + s.totalBalance, 0)
    }

    return NextResponse.json({
      className: decodeURIComponent(className),
      summary,
      students: classReport
    })

  } catch (error) {
    console.error('Error generating class report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}