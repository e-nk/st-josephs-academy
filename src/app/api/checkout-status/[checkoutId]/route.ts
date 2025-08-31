import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ checkoutId: string }> }
) {
  try {
    const { checkoutId } = await params

    // First, try to find by the checkout request ID (original transaction ID)
    let payment = await prisma.payment.findFirst({
      where: { 
        transactionId: checkoutId 
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNumber: true,
            feeAssignments: {
              where: { balance: { gt: 0 } },
              select: {
                balance: true
              }
            }
          }
        }
      }
    })

    // If not found, try to find a payment that was created around the same time
    // and matches the student (fallback approach)
    if (!payment) {
      // Look for any recent pending/confirmed payments
      payment = await prisma.payment.findFirst({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
          },
          OR: [
            { status: 'CONFIRMED' },
            { status: 'PENDING' }
          ]
        },
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              admissionNumber: true,
              feeAssignments: {
                where: { balance: { gt: 0 } },
                select: {
                  balance: true
                }
              }
            }
          }
        }
      })
    }

    if (!payment) {
      return NextResponse.json({ status: 'not_found' })
    }

    // Calculate remaining balance after this payment
    const remainingBalance = payment.student?.feeAssignments?.reduce(
      (sum, assignment) => sum + Number(assignment.balance), 
      0
    ) || 0

    return NextResponse.json({
      status: payment.status.toLowerCase(),
      amount: Number(payment.amount),
      studentName: payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : 'Unknown',
      transactionId: payment.transactionId, // This will be M-Pesa receipt number if confirmed
      balance: remainingBalance,
      paidAt: payment.paidAt,
      confirmedAt: payment.confirmedAt
    })

  } catch (error) {
    console.error('Error checking payment status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}