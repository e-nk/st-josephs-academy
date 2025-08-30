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

    // Fetch all statistics in parallel
    const [
      totalStudents,
      totalCollected,
      totalOutstanding,
      paymentsToday,
      recentPayments,
      recentStudents
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
      })
    ])

    const stats = {
      totalStudents,
      totalCollected: Number(totalCollected._sum.amount || 0),
      totalOutstanding: Number(totalOutstanding._sum.balance || 0),
      paymentsToday,
      recentPayments,
      recentStudents
    }

    return NextResponse.json({ stats })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}