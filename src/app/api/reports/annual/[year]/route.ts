import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { year } = await params
    const academicYear = parseInt(year)

    const yearStart = new Date(`${academicYear}-01-01`)
    const yearEnd = new Date(`${academicYear}-12-31T23:59:59`)

    // Get all payments for the year
    const payments = await prisma.payment.aggregate({
      where: {
        status: 'CONFIRMED',
        confirmedAt: {
          gte: yearStart,
          lte: yearEnd
        }
      },
      _sum: { amount: true },
      _count: true
    })

    // Get payments by month
    const monthlyPayments = await prisma.$queryRaw`
      SELECT 
        EXTRACT(MONTH FROM "confirmedAt") as month,
        SUM("amount")::float as total,
        COUNT(*)::int as count
      FROM "payments" 
      WHERE "status" = 'CONFIRMED' 
        AND "confirmedAt" >= ${yearStart}
        AND "confirmedAt" <= ${yearEnd}
      GROUP BY EXTRACT(MONTH FROM "confirmedAt")
      ORDER BY month
    ` as Array<{ month: number, total: number, count: number }>

    // Get fee structures for the year
    const feeStructures = await prisma.feeStructure.findMany({
      where: { year: academicYear },
      include: {
        feeAssignments: {
          include: {
            student: {
              select: {
                class: true,
                status: true
              }
            }
          }
        }
      }
    })

    // Calculate collection rates by fee structure
    const feeStructureAnalysis = feeStructures.map(fee => {
      const totalAssigned = fee.feeAssignments.length
      const totalExpected = fee.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.amountDue), 0)
      const totalCollected = fee.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.amountPaid), 0)
      const totalOutstanding = fee.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.balance), 0)

      return {
        feeStructure: fee.name,
        term: fee.term,
        studentsAssigned: totalAssigned,
        expectedAmount: totalExpected,
        collectedAmount: totalCollected,
        outstandingAmount: totalOutstanding,
        collectionRate: totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0
      }
    })

    // Get students by status
    const studentsByStatus = await prisma.student.groupBy({
      by: ['status', 'class'],
      _count: true,
      orderBy: [
        { class: 'asc' },
        { status: 'asc' }
      ]
    })

    return NextResponse.json({
      academicYear,
      summary: {
        totalCollected: Number(payments._sum.amount || 0),
        totalTransactions: payments._count,
        averagePaymentAmount: payments._count > 0 ? Number(payments._sum.amount || 0) / payments._count : 0
      },
      monthlyBreakdown: monthlyPayments,
      feeStructureAnalysis,
      studentDistribution: studentsByStatus
    })

  } catch (error) {
    console.error('Error generating annual report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}