import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { smsService } from '@/lib/sms'
import { emailService } from '@/lib/email'

interface MpesaCallback {
  TransactionType: string
  TransID: string
  TransTime: string
  TransAmount: string
  BusinessShortCode: string
  BillRefNumber: string
  InvoiceNumber?: string
  OrgAccountBalance?: string
  ThirdPartyTransID?: string
  MSISDN: string
  FirstName?: string
  MiddleName?: string
  LastName?: string
}

// POST - Handle M-Pesa callback
export async function POST(request: NextRequest) {
  try {
    console.log('=== M-PESA CALLBACK RECEIVED ===')
    console.log('Headers:', Object.fromEntries(request.headers.entries()))
    
    const body = await request.json()
    console.log('Raw callback body:', JSON.stringify(body, null, 2))

    // M-Pesa sends the callback in a specific format
    const callbackData = body.Body?.stkCallback || body
    
    if (!callbackData) {
      console.log('Invalid callback format')
      return NextResponse.json({ error: 'Invalid callback format' }, { status: 400 })
    }

    // Extract payment details
    const resultCode = callbackData.ResultCode
    const resultDesc = callbackData.ResultDesc
    const checkoutRequestID = callbackData.CheckoutRequestID
    
    console.log('Payment result:', { resultCode, resultDesc, checkoutRequestID })
    
    if (resultCode !== 0) {
      console.log('Payment failed:', resultDesc)
      
      // Update the pending payment record to failed
      if (checkoutRequestID) {
        await prisma.payment.updateMany({
          where: { transactionId: checkoutRequestID },
          data: { status: 'FAILED' }
        })
      }
      
      return NextResponse.json({ message: 'Payment failed', resultDesc })
    }

    // Extract callback metadata
    const callbackMetadata = callbackData.CallbackMetadata?.Item || []
    const paymentData: any = {}
    
    console.log('Callback metadata items:', callbackMetadata)
    
    callbackMetadata.forEach((item: any) => {
      paymentData[item.Name] = item.Value
    })

    console.log('Parsed payment data:', paymentData)

    const transactionId = paymentData.MpesaReceiptNumber
    const amount = parseFloat(paymentData.Amount || '0')
    const phoneNumber = paymentData.PhoneNumber?.toString() || ''
    const transactionDate = paymentData.TransactionDate?.toString() || ''
    
		// Parse M-Pesa date format (YYYYMMDDHHmmss) to proper Date
		let parsedDate = new Date()
		if (transactionDate && transactionDate.length >= 14) {
			const year = transactionDate.substring(0, 4)
			const month = transactionDate.substring(4, 6)
			const day = transactionDate.substring(6, 8)
			const hour = transactionDate.substring(8, 10)
			const minute = transactionDate.substring(10, 12)
			const second = transactionDate.substring(12, 14)
			
			parsedDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`)
			console.log('Parsed transaction date:', parsedDate.toISOString())
		} else {
			console.log('Using current date for transaction date')
		}
    // For STK Push, we need to find the student using the CheckoutRequestID
    // because AccountReference might not be in the callback
    const admissionNumber = await findAdmissionNumberByCheckoutRequest(checkoutRequestID)
    
    if (!transactionId || !amount || !admissionNumber) {
      console.log('Missing required payment data:', { 
        transactionId, 
        amount, 
        admissionNumber, 
        checkoutRequestID 
      })
      return NextResponse.json({ error: 'Missing required payment data' }, { status: 400 })
    }

    console.log('Processing payment:', { transactionId, amount, admissionNumber, phoneNumber })

    // Process the payment
		const result = await processPayment({
			transactionId,
			amount,
			admissionNumber,
			phoneNumber,
			transactionDate: parsedDate.toISOString(), // Pass the proper ISO string
			checkoutRequestID
		})

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error processing M-Pesa callback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to find admission number using CheckoutRequestID
async function findAdmissionNumberByCheckoutRequest(checkoutRequestID: string): Promise<string | null> {
  try {
    // Find the pending payment record that was created during STK push
    const pendingPayment = await prisma.payment.findFirst({
      where: { transactionId: checkoutRequestID },
      include: { student: true }
    })

    if (pendingPayment?.student) {
      return pendingPayment.student.admissionNumber
    }

    // If not found, try to extract from referenceNumber
    if (pendingPayment?.referenceNumber) {
      return pendingPayment.referenceNumber
    }

    return null
  } catch (error) {
    console.error('Error finding admission number:', error)
    return null
  }
}

interface PaymentData {
  transactionId: string
  amount: number
  admissionNumber: string
  phoneNumber: string
  transactionDate: string // This will now be a proper ISO string
  checkoutRequestID?: string
}

async function processPayment(data: PaymentData) {
  try {
    // Check if payment already processed with this M-Pesa receipt number
    const existingPayment = await prisma.payment.findFirst({
      where: { 
        OR: [
          { transactionId: data.transactionId }, // M-Pesa receipt number
          { transactionId: data.checkoutRequestID } // Checkout request ID
        ]
      }
    })

    console.log('Existing payment check:', existingPayment?.id || 'None found')

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
      return { error: 'Student not found', requiresManualReview: true }
    }

    console.log('Student found:', student.firstName, student.lastName)
    console.log('Outstanding assignments:', student.feeAssignments.length)

    // Calculate how to allocate the payment across outstanding fees
    const allocationResult = allocatePayment(data.amount, student.feeAssignments)
    
    console.log('Payment allocation:', allocationResult)

    // Start transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update the existing pending payment or create new one
      let payment
      if (existingPayment && existingPayment.status === 'PENDING') {
        // Update the existing pending payment
        payment = await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            transactionId: data.transactionId, // Update with M-Pesa receipt number
            status: 'CONFIRMED',
            paidAt: new Date(data.transactionDate), // Now this will be a valid date
            confirmedAt: new Date(),
          }
        })
      } else {
        // Create new payment record
        payment = await tx.payment.create({
          data: {
            studentId: student.id,
            amount: data.amount,
            paymentMethod: 'MPESA',
            transactionId: data.transactionId, // Use M-Pesa receipt number
            referenceNumber: data.admissionNumber,
            status: 'CONFIRMED',
            paidAt: new Date(data.transactionDate), // Now this will be a valid date
            confirmedAt: new Date(),
          }
        })
      }

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

    console.log('Payment processed successfully:', result.payment.id)
		
				// Calculate new balance for response
		const totalBalance = student.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.balance), 0) - result.totalAllocated

		
		// Send SMS notification to student/parent
		// Send SMS notification to parent
		try {
			const parentPhone = student.parentPhone
			if (parentPhone) {
				const newBalance = Math.max(0, totalBalance)
				const smsMessage = smsService.generatePaymentConfirmationSMS(
					`${student.firstName} ${student.lastName}`,
					student.admissionNumber,
					data.amount,
					newBalance,
					data.transactionId
				)
				
				await smsService.sendSMS(parentPhone, smsMessage)
				console.log('SMS sent to parent:', parentPhone)
			}
		} catch (smsError) {
			console.error('Error sending SMS to parent:', smsError)
			// Don't fail the payment if SMS fails
		}

		// Send notification to director (if director phone is configured)
		try {
			const directorPhone = process.env.DIRECTOR_PHONE
			if (directorPhone) {
				const directorMessage = smsService.generateDirectorNotificationSMS(
					`${student.firstName} ${student.lastName}`,
					student.admissionNumber,
					data.amount,
					'M-PESA',
					data.transactionId
				)
				
				await smsService.sendSMS(directorPhone, directorMessage)
				console.log('SMS sent to director')
			}
		} catch (smsError) {
			console.error('Error sending SMS to director:', smsError)
			// Don't fail the payment if SMS fails
		}


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