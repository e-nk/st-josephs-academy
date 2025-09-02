import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { smsService } from '@/lib/sms'

// POST - Resolve unmatched payment by matching to student
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Session user:', session.user)
    console.log('Session user ID:', session.user.id)

    const { id } = await params
    const { studentId, adminNotes } = await request.json()

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    // Verify the user exists in the database
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser) {
      console.error('User not found in database:', session.user.id)
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    // Get the unmatched payment
    // @ts-ignore - Prisma type issue
    const unmatchedPayment = await prisma.unmatchedPayment.findUnique({
      where: { id }
    })

    if (!unmatchedPayment) {
      return NextResponse.json({ error: 'Unmatched payment not found' }, { status: 404 })
    }

    if (unmatchedPayment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Payment has already been resolved' }, { status: 400 })
    }

    // Get the student with their outstanding fees
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        feeAssignments: {
          where: { balance: { gt: 0 } },
          orderBy: { createdAt: 'asc' },
          include: { feeStructure: true }
        },
        // @ts-ignore - Prisma type issue
        credits: {
          where: { 
            isActive: true,
            remainingAmount: { gt: 0 }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Process the resolution in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the payment record
      const payment = await tx.payment.create({
        data: {
          studentId: student.id,
          amount: unmatchedPayment.amount,
          paymentMethod: unmatchedPayment.paymentMethod,
          transactionId: unmatchedPayment.transactionId,
          referenceNumber: student.admissionNumber,
          status: 'CONFIRMED',
          paidAt: unmatchedPayment.transactionDate,
          confirmedAt: new Date(),
        }
      })

      // Allocate payment to outstanding fees
      let remainingAmount = Number(unmatchedPayment.amount)
      const allocations = []

      for (const assignment of student.feeAssignments) {
        if (remainingAmount <= 0) break
        
        const outstandingBalance = Number(assignment.balance)
        const allocationAmount = Math.min(remainingAmount, outstandingBalance)
        
        if (allocationAmount > 0) {
          await tx.feeAssignment.update({
            where: { id: assignment.id },
            data: {
              amountPaid: { increment: allocationAmount },
              balance: { decrement: allocationAmount },
              status: (outstandingBalance - allocationAmount) === 0 ? 'CONFIRMED' : 'PENDING'
            }
          })
          
          allocations.push({
            feeAssignmentId: assignment.id,
            amount: allocationAmount,
            newBalance: outstandingBalance - allocationAmount
          })
          
          remainingAmount -= allocationAmount
        }
      }

      // Handle overpayment - create credit
      if (remainingAmount > 0) {
        // @ts-ignore - Prisma type issue
        await tx.studentCredit.create({
          data: {
            studentId: student.id,
            amount: remainingAmount,
            source: `Manual resolution of unmatched payment ${unmatchedPayment.transactionId}`,
            remainingAmount: remainingAmount,
            isActive: true
          }
        })
      }

      // Mark unmatched payment as resolved
      // @ts-ignore - Prisma type issue
      const resolvedPayment = await tx.unmatchedPayment.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedById: currentUser.id, // Use the verified user ID
          resolvedAt: new Date(),
          createdPaymentId: payment.id,
          adminNotes: adminNotes || `Manually resolved and matched to ${student.firstName} ${student.lastName} (${student.admissionNumber})`
        }
      })

      return {
        payment,
        allocations,
        overpaymentAmount: remainingAmount,
        resolvedPayment
      }
    })

    // Calculate new balance
    const finalFeeAssignments = await prisma.feeAssignment.findMany({
      where: { studentId: student.id }
    })
    
    const finalBalance = finalFeeAssignments.reduce(
      (sum, assignment) => sum + Number(assignment.balance), 
      0
    )

    // Send notifications
    try {
      const parentPhone = student.parentPhone
      if (parentPhone) {
        const smsMessage = smsService.generatePaymentConfirmationSMS(
          `${student.firstName} ${student.lastName}`,
          student.admissionNumber,
          Number(unmatchedPayment.amount),
          finalBalance,
          unmatchedPayment.transactionId
        )
        
        await smsService.sendSMS(parentPhone, smsMessage)
      }
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError)
      // Don't fail the resolution if notifications fail
    }

    return NextResponse.json({
      success: true,
      message: 'Payment resolved successfully',
      result: {
        studentName: `${student.firstName} ${student.lastName}`,
        amountAllocated: Number(unmatchedPayment.amount) - result.overpaymentAmount,
        overpaymentAmount: result.overpaymentAmount,
        newBalance: finalBalance
      }
    })

  } catch (error) {
    console.error('Error resolving unmatched payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}