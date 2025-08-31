import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params

    const payment = await prisma.payment.findFirst({
      where: { 
        transactionId: transactionId 
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNumber: true
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json({ status: 'not_found' })
    }

    return NextResponse.json({
      status: payment.status.toLowerCase(),
      amount: Number(payment.amount),
      studentName: payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : 'Unknown',
      transactionId: payment.transactionId,
      paidAt: payment.paidAt,
      confirmedAt: payment.confirmedAt
    })

  } catch (error) {
    console.error('Error checking payment status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}