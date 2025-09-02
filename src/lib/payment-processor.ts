import { prisma } from '@/lib/db'
import { smsService } from '@/lib/sms'
import { emailService } from '@/lib/email'
import { studentLedgerService } from '@/lib/student-ledger'

// Define types locally to avoid Prisma generation issues
type UnmatchedPaymentStatus = 'PENDING' | 'RESOLVED' | 'REJECTED'

interface C2BPaymentData {
  transactionId: string
  amount: number
  accountReference: string
  phoneNumber: string
  payerName: string
  transactionDate: string
  paymentMethod: 'MPESA'
}

interface PaymentAllocation {
  feeAssignmentId: string
  amount: number
  newBalance: number
}

interface ProcessPaymentResult {
  success: boolean
  matched: boolean
  studentId?: string
  studentName?: string
  allocations?: PaymentAllocation[]
  totalAllocated?: number
  overpaymentAmount?: number
  unmatchedPaymentId?: string
  error?: string
}

/**
 * Process C2B payment - handle both matched and unmatched payments
 */
export async function processC2BPayment(paymentData: C2BPaymentData): Promise<ProcessPaymentResult> {
  try {
    console.log('Processing C2B payment:', paymentData)

    // Try to find student by admission number
    const student = await prisma.student.findUnique({
      where: { admissionNumber: paymentData.accountReference },
      include: {
        feeAssignments: {
          where: { balance: { gt: 0 } },
          orderBy: { createdAt: 'asc' },
          include: { feeStructure: true }
        },
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
      // Student not found - create unmatched payment
      console.log('Student not found, creating unmatched payment:', paymentData.accountReference)
      return await createUnmatchedPayment(paymentData)
    }

    // Student found - process matched payment
    console.log('Student found, processing payment for:', student.firstName, student.lastName)
    return await processMatchedPayment(paymentData, student)

  } catch (error) {
    console.error('Error in processC2BPayment:', error)
    return {
      success: false,
      matched: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Create unmatched payment for manual review
 */
async function createUnmatchedPayment(paymentData: C2BPaymentData): Promise<ProcessPaymentResult> {
  try {
    const unmatchedPayment = await prisma.unmatchedPayment.create({
      data: {
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        transactionId: paymentData.transactionId,
        accountReference: paymentData.accountReference,
        phoneNumber: paymentData.phoneNumber,
        payerName: paymentData.payerName,
        transactionDate: new Date(paymentData.transactionDate),
        status: 'PENDING'
      }
    })

    console.log('Unmatched payment created:', unmatchedPayment.id)

    // Notify director about unmatched payment
    try {
      const directorPhone = process.env.DIRECTOR_PHONE
      if (directorPhone) {
        const message = `UNMATCHED PAYMENT ALERT - ST. JOSEPH'S CENTRAL ACADEMY-SIRONOI
Amount: KES ${paymentData.amount}
Reference: ${paymentData.accountReference}
From: ${paymentData.payerName}
Ref: ${paymentData.transactionId}
Requires manual review.`
        
        await smsService.sendSMS(directorPhone, message)
      }
    } catch (notificationError) {
      console.error('Error sending unmatched payment notification:', notificationError)
    }

    return {
      success: true,
      matched: false,
      unmatchedPaymentId: unmatchedPayment.id
    }

  } catch (error) {
    console.error('Error creating unmatched payment:', error)
    return {
      success: false,
      matched: false,
      error: error instanceof Error ? error.message : 'Failed to create unmatched payment'
    }
  }
}

/**
 * Process payment for a matched student
 */
async function processMatchedPayment(paymentData: C2BPaymentData, student: any): Promise<ProcessPaymentResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Calculate total outstanding fees
      const totalOutstanding = student.feeAssignments.reduce(
        (sum: number, assignment: any) => sum + Number(assignment.balance), 
        0
      )

      // Check if student has existing credits
      const totalCredits = student.credits.reduce(
        (sum: number, credit: any) => sum + Number(credit.remainingAmount),
        0
      )

      console.log('Payment allocation:', {
        paymentAmount: paymentData.amount,
        totalOutstanding,
        totalCredits,
        studentName: `${student.firstName} ${student.lastName}`
      })

      // Create the payment record first
      const payment = await tx.payment.create({
        data: {
          studentId: student.id,
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod,
          transactionId: paymentData.transactionId,
          referenceNumber: paymentData.accountReference,
          status: 'CONFIRMED',
          paidAt: new Date(paymentData.transactionDate),
          confirmedAt: new Date(),
        }
      })

      // Record payment in ledger
      await studentLedgerService.recordPayment(
        student.id,
        payment.id,
        paymentData.amount,
        paymentData.paymentMethod,
        paymentData.transactionId,
        tx
      )

      let remainingAmount = paymentData.amount
      const allocations: PaymentAllocation[] = []

      // First, apply existing credits to outstanding fees if any
      if (totalCredits > 0 && totalOutstanding > 0) {
        const creditsToUse = Math.min(totalCredits, totalOutstanding)
        await applyCreditsToFees(tx, student.credits, student.feeAssignments, creditsToUse)
        console.log(`Applied ${creditsToUse} in existing credits to fees`)
      }

      // Then allocate the new payment to remaining outstanding fees
      const updatedAssignments = await tx.feeAssignment.findMany({
        where: { 
          studentId: student.id,
          balance: { gt: 0 }
        },
        orderBy: { createdAt: 'asc' }
      })

      for (const assignment of updatedAssignments) {
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
          console.log(`Allocated ${allocationAmount} to fee assignment ${assignment.id}`)
        }
      }

      const totalAllocated = paymentData.amount - remainingAmount

      // Handle overpayment - create credit for future use
      let overpaymentAmount = 0
      if (remainingAmount > 0) {
        overpaymentAmount = remainingAmount
        await tx.studentCredit.create({
          data: {
            studentId: student.id,
            amount: overpaymentAmount,
            source: `Overpayment from transaction ${paymentData.transactionId}`,
            remainingAmount: overpaymentAmount,
            isActive: true
          }
        })

        // Record credit creation in ledger
        await studentLedgerService.recordCreditCreation(
          student.id,
          overpaymentAmount,
          `Overpayment from transaction ${paymentData.transactionId}`,
          tx
        )
        
        console.log(`Created credit of ${overpaymentAmount} for overpayment`)
      }

      // Calculate new balance after payment and credit application
      const finalBalance = await calculateStudentBalance(tx, student.id)

      // Send notifications
      await sendPaymentNotifications(
        student,
        paymentData.amount,
        finalBalance,
        paymentData.transactionId,
        overpaymentAmount
      )

      return {
        success: true,
        matched: true,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        allocations,
        totalAllocated,
        overpaymentAmount
      }
    })

  } catch (error) {
    console.error('Error processing matched payment:', error)
    return {
      success: false,
      matched: true,
      error: error instanceof Error ? error.message : 'Failed to process matched payment'
    }
  }
}

/**
 * Apply existing credits to outstanding fees
 */
async function applyCreditsToFees(tx: any, credits: any[], feeAssignments: any[], amountToApply: number) {
  let remainingToApply = amountToApply

  for (const assignment of feeAssignments) {
    if (remainingToApply <= 0) break
    
    const outstandingBalance = Number(assignment.balance)
    const applicationAmount = Math.min(remainingToApply, outstandingBalance)
    
    if (applicationAmount > 0) {
      await tx.feeAssignment.update({
        where: { id: assignment.id },
        data: {
          amountPaid: { increment: applicationAmount },
          balance: { decrement: applicationAmount },
          status: (outstandingBalance - applicationAmount) === 0 ? 'CONFIRMED' : 'PENDING'
        }
      })
      
      remainingToApply -= applicationAmount
    }
  }

  // Update credits
  let remainingToDeduct = amountToApply - remainingToApply
  for (const credit of credits) {
    if (remainingToDeduct <= 0) break
    
    const availableCredit = Number(credit.remainingAmount)
    const deductionAmount = Math.min(remainingToDeduct, availableCredit)
    
    if (deductionAmount > 0) {
      const newRemainingAmount = availableCredit - deductionAmount
      
      await tx.studentCredit.update({
        where: { id: credit.id },
        data: {
          usedAmount: { increment: deductionAmount },
          remainingAmount: newRemainingAmount,
          isActive: newRemainingAmount > 0
        }
      })
      
      remainingToDeduct -= deductionAmount
    }
  }
}

/**
 * Calculate student's total balance including credits
 */
async function calculateStudentBalance(tx: any, studentId: string): Promise<number> {
  const feeAssignments = await tx.feeAssignment.findMany({
    where: { studentId }
  })
  
  const credits = await tx.studentCredit.findMany({
    where: { 
      studentId,
      isActive: true,
      remainingAmount: { gt: 0 }
    }
  })
  
  const totalOutstanding = feeAssignments.reduce(
    (sum: number, assignment: any) => sum + Number(assignment.balance), 
    0
  )
  
  const totalCredits = credits.reduce(
    (sum: number, credit: any) => sum + Number(credit.remainingAmount), 
    0
  )
  
  return Math.max(0, totalOutstanding - totalCredits)
}

/**
 * Calculate student's net balance including credits
 * Returns: Positive = owes money, Negative = has credit, Zero = fully paid
 */
export async function calculateStudentNetBalance(studentId: string, tx?: any): Promise<number> {
  const db = tx || prisma
  
  const [feeAssignments, credits] = await Promise.all([
    db.feeAssignment.findMany({
      where: { studentId }
    }),
    // @ts-ignore - Prisma type issue
    db.studentCredit.findMany({
      where: { 
        studentId,
        isActive: true,
        remainingAmount: { gt: 0 }
      }
    })
  ])
  
  const totalOutstanding = feeAssignments.reduce(
    (sum: number, assignment: any) => sum + Number(assignment.balance), 
    0
  )
  
  const totalCredits = credits.reduce(
    (sum: number, credit: any) => sum + Number(credit.remainingAmount), 
    0
  )
  
  // Return net balance: positive = owes, negative = has credit
  return totalOutstanding - totalCredits
}

/**
 * Get detailed student balance breakdown
 */
export async function getStudentBalanceBreakdown(studentId: string) {
  const [feeAssignments, credits, payments] = await Promise.all([
    prisma.feeAssignment.findMany({
      where: { studentId },
      include: { feeStructure: true },
      orderBy: { createdAt: 'asc' }
    }),
    // @ts-ignore - Prisma type issue
    prisma.studentCredit.findMany({
      where: { studentId, isActive: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.payment.findMany({
      where: { studentId, status: 'CONFIRMED' },
      orderBy: { confirmedAt: 'desc' },
      take: 10 // Recent payments
    })
  ])
  
  const totalDue = feeAssignments.reduce((sum, assignment) => sum + Number(assignment.amountDue), 0)
  const totalPaid = feeAssignments.reduce((sum, assignment) => sum + Number(assignment.amountPaid), 0)
  const totalOutstanding = feeAssignments.reduce((sum, assignment) => sum + Number(assignment.balance), 0)
  const totalCredits = credits.reduce((sum, credit) => sum + Number(credit.remainingAmount), 0)
  const netBalance = totalOutstanding - totalCredits
  
  return {
    totalDue,
    totalPaid,
    totalOutstanding,
    totalCredits,
    netBalance, // Negative means student has credit
    hasCredit: netBalance < 0,
    owesAmount: Math.max(0, netBalance),
    creditAmount: Math.max(0, -netBalance),
    feeAssignments,
    credits,
    recentPayments: payments
  }
}
async function sendPaymentNotifications(
  student: any, 
  amountPaid: number, 
  newBalance: number, 
  transactionId: string,
  overpaymentAmount: number = 0
) {
  try {
    // SMS to parent
    const parentPhone = student.parentPhone
    if (parentPhone) {
      let smsMessage = smsService.generatePaymentConfirmationSMS(
        `${student.firstName} ${student.lastName}`,
        student.admissionNumber,
        amountPaid,
        newBalance,
        transactionId
      )
      
      if (overpaymentAmount > 0) {
        smsMessage += `\nOverpayment of KES ${overpaymentAmount} saved as credit for future fees.`
      }
      
      await smsService.sendSMS(parentPhone, smsMessage)
      console.log('SMS sent to parent')
    }

    // SMS to director
    const directorPhone = process.env.DIRECTOR_PHONE
    if (directorPhone) {
      const directorMessage = smsService.generateDirectorNotificationSMS(
        `${student.firstName} ${student.lastName}`,
        student.admissionNumber,
        amountPaid,
        'M-PESA C2B',
        transactionId
      )
      
      await smsService.sendSMS(directorPhone, directorMessage)
      console.log('SMS sent to director')
    }

  } catch (error) {
    console.error('Error sending payment notifications:', error)
    // Don't fail the payment if notifications fail
  }
}