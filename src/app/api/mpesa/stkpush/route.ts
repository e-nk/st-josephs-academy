import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { mpesaService } from '@/lib/mpesa'
import { z } from 'zod'

const stkPushSchema = z.object({
  admissionNumber: z.string().min(1, 'Admission number is required'),
  phoneNumber: z.string().min(10, 'Valid phone number is required'),
  amount: z.number().positive('Amount must be greater than 0'),
})

// POST - Initiate STK push (Public endpoint - no authentication required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = stkPushSchema.parse(body)

    // Verify student exists and has outstanding fees
    const student = await prisma.student.findUnique({
      where: { admissionNumber: validatedData.admissionNumber },
      include: {
        feeAssignments: {
          where: { balance: { gt: 0 } },
          include: { feeStructure: true }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (student.feeAssignments.length === 0) {
      return NextResponse.json({ error: 'No outstanding fees for this student' }, { status: 400 })
    }

    const totalOutstanding = student.feeAssignments.reduce(
      (sum, assignment) => sum + Number(assignment.balance), 
      0
    )

    if (validatedData.amount > totalOutstanding) {
      return NextResponse.json({ 
        error: `Payment amount (${validatedData.amount}) exceeds outstanding balance (${totalOutstanding})` 
      }, { status: 400 })
    }

    // Initiate STK push
    const mpesaResponse = await mpesaService.initiateSTKPush(
      validatedData.phoneNumber,
      validatedData.amount,
      validatedData.admissionNumber
    )

    // Store the STK push request for tracking
    await prisma.payment.create({
      data: {
        studentId: student.id,
        amount: validatedData.amount,
        paymentMethod: 'MPESA',
        referenceNumber: validatedData.admissionNumber,
        status: 'PENDING',
        transactionId: mpesaResponse.CheckoutRequestID || `STK_${Date.now()}`,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'STK push initiated successfully',
      checkoutRequestId: mpesaResponse.CheckoutRequestID,
      studentName: `${student.firstName} ${student.lastName}`,
      outstandingBalance: totalOutstanding,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error initiating STK push:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to initiate payment request. Please try again.' 
    }, { status: 500 })
  }
}