import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current date for today's payments
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get this month's date range
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    // Fetch all statistics in parallel
    const [
      totalStudents,
      totalCollected,
      totalOutstanding,
      paymentsToday,
      paymentsThisMonth,
      activeFeeStructures,
      recentPayments,
      recentStudents,
      paymentMethodStats,
      topPayingStudents
    ] = await Promise.all([
      // Total students count
      prisma.student.count(),
      
      // Total amount collected (confirmed payments only)
      prisma.payment.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { amount: true }
      }),
      
      // Total outstanding (sum of all balances from fee assignments)
      prisma.feeAssignment.aggregate({
        where: { balance: { gt: 0 } },
        _sum: { balance: true }
      }),
      
      // Today's payments count
      prisma.payment.count({
        where: {
          status: 'CONFIRMED',
          confirmedAt: {
            gte: today,
            lt: tomorrow
          }
        }
      }),

      // This month's payments
      prisma.payment.aggregate({
        where: {
          status: 'CONFIRMED',
          confirmedAt: {
            gte: firstDayOfMonth,
          }
        },
        _sum: { amount: true },
        _count: true
      }),

      // Active fee structures count
      prisma.feeStructure.count({
        where: { isActive: true }
      }),
      
      // Recent payments (last 5)
      prisma.payment.findMany({
        where: { status: 'CONFIRMED' },
        take: 5,
        orderBy: { confirmedAt: 'desc' },
        include: {
          student: {
            select: {
              admissionNumber: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      
      // Recent students (last 5)
      prisma.student.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          admissionNumber: true,
          firstName: true,
          lastName: true,
          class: true,
          createdAt: true
        }
      }),

      // Payment method statistics
      prisma.payment.groupBy({
        by: ['paymentMethod'],
        where: { status: 'CONFIRMED' },
        _sum: { amount: true },
        _count: true
      }),

      // Top paying students this month
      prisma.payment.groupBy({
        by: ['studentId'],
        where: {
          status: 'CONFIRMED',
          confirmedAt: {
            gte: firstDayOfMonth,
          },
          studentId: { not: null }
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5
      }).then(async (groupedPayments) => {
        // Get student details for top payers
        const studentIds = groupedPayments
          .filter(p => p.studentId)
          .map(p => p.studentId!)
        
        if (studentIds.length === 0) return []
        
        const students = await prisma.student.findMany({
          where: { id: { in: studentIds } },
          select: {
            id: true,
            admissionNumber: true,
            firstName: true,
            lastName: true,
            class: true
          }
        })

        return groupedPayments.map(payment => ({
          ...payment,
          student: students.find(s => s.id === payment.studentId)
        }))
      })
    ])

    const stats = {
      totalStudents,
      totalCollected: Number(totalCollected._sum.amount || 0),
      totalOutstanding: Number(totalOutstanding._sum.balance || 0),
      paymentsToday,
      paymentsThisMonth: {
        count: paymentsThisMonth._count,
        amount: Number(paymentsThisMonth._sum.amount || 0)
      },
      activeFeeStructures,
      recentPayments,
      recentStudents,
      paymentMethodStats: paymentMethodStats.map(stat => ({
        method: stat.paymentMethod,
        count: stat._count,
        amount: Number(stat._sum.amount || 0)
      })),
      topPayingStudents: topPayingStudents.map(payer => ({
        student: payer.student,
        totalPaid: Number(payer._sum.amount || 0)
      }))
    }

    return NextResponse.json({ stats })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}