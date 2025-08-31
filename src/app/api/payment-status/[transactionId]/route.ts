import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params

    // Look for payment by either the checkout request ID or the M-Pesa receipt number
    const payment = await prisma.payment.findFirst({
      where: { 
        OR: [
          { transactionId: transactionId }, // This could be either CheckoutRequestID or MpesaReceiptNumber
          { referenceNumber: transactionId }, // In case it's stored as reference
        ]
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

    if (!payment) {
      return NextResponse.json({ status: 'not_found' })
    }

    // Calculate remaining balance
    const remainingBalance = payment.student?.feeAssignments?.reduce(
      (sum, assignment) => sum + Number(assignment.balance), 
      0
    ) || 0

    return NextResponse.json({
      status: payment.status.toLowerCase(),
      amount: Number(payment.amount),
      studentName: payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : 'Unknown',
      transactionId: payment.transactionId, // This will be the M-Pesa receipt number after confirmation
      balance: Math.max(0, remainingBalance),
      paidAt: payment.paidAt,
      confirmedAt: payment.confirmedAt
    })

  } catch (error) {
    console.error('Error checking payment status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}