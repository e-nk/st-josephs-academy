import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
// import crypto from 'crypto-js'

interface MpesaCallback {
  TransactionType: string
  TransID: string
  TransTime: string
  TransAmount: string
  BusinessShortCode: string
  BillRefNumber: string // This will be the student's admission number
  InvoiceNumber?: string
  OrgAccountBalance?: string
  ThirdPartyTransID?: string
  MSISDN: string // Phone number
  FirstName?: string
  MiddleName?: string
  LastName?: string
}

// POST - Handle M-Pesa callback
export async function POST(request: NextRequest) {
  try {
    console.log('M-Pesa callback received')
    
    const body = await request.json()
    console.log('Callback data:', JSON.stringify(body, null, 2))

    // M-Pesa sends the callback in a specific format
    const callbackData = body.Body?.stkCallback || body
    
    if (!callbackData) {
      console.log('Invalid callback format')
      return NextResponse.json({ error: 'Invalid callback format' }, { status: 400 })
    }

    // Extract payment details
    const resultCode = callbackData.ResultCode
    const resultDesc = callbackData.ResultDesc
    
    if (resultCode !== 0) {
      console.log('Payment failed:', resultDesc)
      return NextResponse.json({ message: 'Payment failed', resultDesc })
    }

    // Extract callback metadata
    const callbackMetadata = callbackData.CallbackMetadata?.Item || []
    const paymentData: any = {}
    
    callbackMetadata.forEach((item: any) => {
      paymentData[item.Name] = item.Value
    })

    const transactionId = paymentData.MpesaReceiptNumber
    const amount = parseFloat(paymentData.Amount || '0')
    const phoneNumber = paymentData.PhoneNumber?.toString() || ''
    const transactionDate = paymentData.TransactionDate?.toString() || ''
    
    // The account number should be the student's admission number
    // This comes from BillRefNumber or can be extracted from other fields
    const admissionNumber = paymentData.AccountReference || body.BillRefNumber
    
    if (!transactionId || !amount || !admissionNumber) {
      console.log('Missing required payment data')
      return NextResponse.json({ error: 'Missing required payment data' }, { status: 400 })
    }

    console.log('Processing payment:', { transactionId, amount, admissionNumber, phoneNumber })

    // Process the payment
    const result = await processPayment({
      transactionId,
      amount,
      admissionNumber,
      phoneNumber,
      transactionDate,
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error processing M-Pesa callback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface PaymentData {
  transactionId: string
  amount: number
  admissionNumber: string
  phoneNumber: string
  transactionDate: string
}

async function processPayment(data: PaymentData) {
  try {
    // Check if payment already exists (prevent duplicate processing)
    const existingPayment = await prisma.payment.findFirst({
			where: { transactionId: data.transactionId }
		})

    if (existingPayment) {
      console.log('Payment already processed:', data.transactionId)
      return { message: 'Payment already processed' }
    }

    // Find student by admission number
    const student = await prisma.student.findUnique({
      where: { admissionNumber: data.admissionNumber },
      include: {
        feeAssignments: {
          where: { balance: { gt: 0 } },
          orderBy: { createdAt: 'asc' },
          include: { feeStructure: true }
        }
      }
    })

    if (!student) {
			console.log('Student not found:', data.admissionNumber)
			await prisma.payment.create({
				data: {
					studentId: '',
					amount: data.amount,
					paymentMethod: 'MPESA',
					transactionId: data.transactionId,
					referenceNumber: data.admissionNumber,
					status: 'PENDING',
					paidAt: data.transactionDate ? new Date(data.transactionDate) : new Date(), // Safe date parsing here too
				}
			})
			
			return { error: 'Student not found', requiresManualReview: true }
		}
    // Calculate how to allocate the payment across outstanding fees
    const allocationResult = allocatePayment(data.amount, student.feeAssignments)
    
    // Start transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the payment record
      const payment = await tx.payment.create({
			data: {
				studentId: student.id,
				amount: data.amount,
				paymentMethod: 'MPESA',
				transactionId: data.transactionId,
				referenceNumber: data.admissionNumber,
				status: 'CONFIRMED',
				paidAt: data.transactionDate ? new Date(data.transactionDate) : new Date(), // Safe date parsing
				confirmedAt: new Date(),
			}
		})

      // Update fee assignments
      for (const allocation of allocationResult.allocations) {
        await tx.feeAssignment.update({
          where: { id: allocation.feeAssignmentId },
          data: {
            amountPaid: { increment: allocation.amount },
            balance: { decrement: allocation.amount },
            status: allocation.newBalance === 0 ? 'CONFIRMED' : 'PENDING'
          }
        })
      }

      return {
        payment,
        allocations: allocationResult.allocations,
        totalAllocated: allocationResult.totalAllocated,
        remainingAmount: allocationResult.remainingAmount
      }
    })

    console.log('Payment processed successfully:', result)

    // TODO: Send SMS notification to parent
    // TODO: Send email receipt
    
    // Calculate new balance for SMS
    const totalBalance = student.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.balance), 0) - result.totalAllocated
    
    return {
      message: 'Payment processed successfully',
      student: {
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber
      },
      payment: {
        amount: data.amount,
        transactionId: data.transactionId,
        balance: Math.max(0, totalBalance)
      }
    }

  } catch (error) {
    console.error('Error in processPayment:', error)
    throw error
  }
}

function allocatePayment(paymentAmount: number, feeAssignments: any[]) {
  const allocations: Array<{
    feeAssignmentId: string
    amount: number
    newBalance: number
  }> = []
  
  let remainingAmount = paymentAmount
  let totalAllocated = 0

  // Allocate payment starting with oldest fees first
  for (const assignment of feeAssignments) {
    if (remainingAmount <= 0) break
    
    const outstandingBalance = Number(assignment.balance)
    const allocationAmount = Math.min(remainingAmount, outstandingBalance)
    
    if (allocationAmount > 0) {
      allocations.push({
        feeAssignmentId: assignment.id,
        amount: allocationAmount,
        newBalance: outstandingBalance - allocationAmount
      })
      
      remainingAmount -= allocationAmount
      totalAllocated += allocationAmount
    }
  }

  return {
    allocations,
    totalAllocated,
    remainingAmount
  }
}