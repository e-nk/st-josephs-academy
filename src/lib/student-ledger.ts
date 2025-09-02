import { prisma } from '@/lib/db'

export type LedgerTransactionType = 'FEE_CHARGE' | 'PAYMENT' | 'CREDIT_APPLIED' | 'CREDIT_CREATED' | 'ADJUSTMENT'

interface LedgerEntry {
  studentId: string
  transactionType: LedgerTransactionType
  description: string
  amount: number // Positive for credits, negative for debits
  referenceId?: string
  academicYear?: number
  term?: string
  transactionDate?: Date
}

/**
 * Student Ledger Management Service
 * Tracks all financial transactions like a bank statement
 */
class StudentLedgerService {
  
  /**
   * Add a new ledger entry and update running balance
   */
  async addLedgerEntry(entry: LedgerEntry, tx?: any) {
    const db = tx || prisma
    
    // Get the current balance for this student
    const lastEntry = await db.studentLedger.findFirst({
      where: { studentId: entry.studentId },
      orderBy: { transactionDate: 'desc' },
      select: { runningBalance: true }
    })
    
    const currentBalance = lastEntry ? Number(lastEntry.runningBalance) : 0
    const newBalance = currentBalance + entry.amount
    
    // Create the ledger entry
    // @ts-ignore - Prisma type issue
    const ledgerEntry = await db.studentLedger.create({
      data: {
        studentId: entry.studentId,
        transactionType: entry.transactionType,
        description: entry.description,
        amount: entry.amount,
        runningBalance: newBalance,
        referenceId: entry.referenceId,
        academicYear: entry.academicYear,
        term: entry.term,
        transactionDate: entry.transactionDate || new Date()
      }
    })
    
    console.log(`Ledger entry created: ${entry.description} - Amount: ${entry.amount} - New Balance: ${newBalance}`)
    
    return ledgerEntry
  }
  
  /**
   * Record fee assignment (debit)
   */
  async recordFeeCharge(
    studentId: string, 
    feeStructureId: string, 
    amount: number, 
    feeName: string,
    academicYear?: number,
    term?: string,
    tx?: any
  ) {
    return this.addLedgerEntry({
      studentId,
      transactionType: 'FEE_CHARGE',
      description: `Fee Assigned: ${feeName}`,
      amount: -Math.abs(amount), // Always negative for fees
      referenceId: feeStructureId,
      academicYear,
      term
    }, tx)
  }
  
  /**
   * Record payment received (credit)
   */
  async recordPayment(
    studentId: string,
    paymentId: string,
    amount: number,
    paymentMethod: string,
    transactionId: string,
    tx?: any
  ) {
    return this.addLedgerEntry({
      studentId,
      transactionType: 'PAYMENT',
      description: `Payment Received (${paymentMethod}) - ${transactionId}`,
      amount: Math.abs(amount), // Always positive for payments
      referenceId: paymentId
    }, tx)
  }
  
  /**
   * Record credit application to fees
   */
  async recordCreditApplication(
    studentId: string,
    amount: number,
    feeName: string,
    tx?: any
  ) {
    return this.addLedgerEntry({
      studentId,
      transactionType: 'CREDIT_APPLIED',
      description: `Credit Applied to ${feeName}`,
      amount: -Math.abs(amount), // Negative because credit is being used up
      referenceId: null
    }, tx)
  }
  
  /**
   * Record overpayment credit creation
   */
  async recordCreditCreation(
    studentId: string,
    amount: number,
    source: string,
    tx?: any
  ) {
    return this.addLedgerEntry({
      studentId,
      transactionType: 'CREDIT_CREATED',
      description: `Credit Created: ${source}`,
      amount: Math.abs(amount), // Positive for credit creation
      referenceId: null
    }, tx)
  }
  
  /**
   * Get complete ledger history for a student
   */
  async getStudentLedger(studentId: string, limit?: number) {
    // @ts-ignore - Prisma type issue
    const ledgerEntries = await prisma.studentLedger.findMany({
      where: { studentId },
      orderBy: { transactionDate: 'desc' },
      take: limit,
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
    
    // Get current balance
    const currentBalance = ledgerEntries.length > 0 ? 
      Number(ledgerEntries[0].runningBalance) : 0
    
    // Categorize balance
    const balanceStatus = currentBalance > 0 ? 'CREDIT' : 
                         currentBalance < 0 ? 'OUTSTANDING' : 'SETTLED'
    
    return {
      studentId,
      currentBalance,
      balanceStatus,
      entries: ledgerEntries.map(entry => ({
        id: entry.id,
        type: entry.transactionType,
        description: entry.description,
        amount: Number(entry.amount),
        runningBalance: Number(entry.runningBalance),
        transactionDate: entry.transactionDate,
        academicYear: entry.academicYear,
        term: entry.term,
        referenceId: entry.referenceId
      })),
      summary: {
        totalFeeCharges: ledgerEntries
          .filter(e => e.transactionType === 'FEE_CHARGE')
          .reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0),
        totalPayments: ledgerEntries
          .filter(e => e.transactionType === 'PAYMENT')
          .reduce((sum, e) => sum + Number(e.amount), 0),
        totalCreditsUsed: ledgerEntries
          .filter(e => e.transactionType === 'CREDIT_APPLIED')
          .reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0),
        totalCreditsCreated: ledgerEntries
          .filter(e => e.transactionType === 'CREDIT_CREATED')
          .reduce((sum, e) => sum + Number(e.amount), 0)
      }
    }
  }
  
  /**
   * Get balance at a specific point in time
   */
  async getBalanceAtDate(studentId: string, date: Date) {
    // @ts-ignore - Prisma type issue
    const lastEntry = await prisma.studentLedger.findFirst({
      where: { 
        studentId,
        transactionDate: { lte: date }
      },
      orderBy: { transactionDate: 'desc' },
      select: { runningBalance: true }
    })
    
    return lastEntry ? Number(lastEntry.runningBalance) : 0
  }
  
  /**
   * Process fee assignment with automatic credit application
   */
  async processFeeAssignmentWithCredits(
    studentId: string,
    feeStructureId: string,
    feeAmount: number,
    feeName: string,
    academicYear: number,
    term?: string,
    tx?: any
  ) {
    const db = tx || prisma
    
    // Record the fee charge first
    await this.recordFeeCharge(
      studentId, 
      feeStructureId, 
      feeAmount, 
      feeName, 
      academicYear, 
      term, 
      db
    )
    
    // Check if student has available credits
    // @ts-ignore - Prisma type issue
    const availableCredits = await db.studentCredit.findMany({
      where: {
        studentId,
        isActive: true,
        remainingAmount: { gt: 0 }
      },
      orderBy: { createdAt: 'asc' } // Use oldest credits first
    })
    
    const totalAvailableCredit = availableCredits.reduce(
      (sum: number, credit: any) => sum + Number(credit.remainingAmount), 
      0
    )
    
    if (totalAvailableCredit > 0) {
      const creditToApply = Math.min(totalAvailableCredit, feeAmount)
      
      // Apply credits to the fee
      let remainingToApply = creditToApply
      for (const credit of availableCredits) {
        if (remainingToApply <= 0) break
        
        const availableAmount = Number(credit.remainingAmount)
        const applicationAmount = Math.min(remainingToApply, availableAmount)
        
        // Update the credit record
        const newRemainingAmount = availableAmount - applicationAmount
        // @ts-ignore - Prisma type issue
        await db.studentCredit.update({
          where: { id: credit.id },
          data: {
            usedAmount: { increment: applicationAmount },
            remainingAmount: newRemainingAmount,
            isActive: newRemainingAmount > 0
          }
        })
        
        remainingToApply -= applicationAmount
      }
      
      // Record the credit application in ledger
      await this.recordCreditApplication(
        studentId,
        creditToApply,
        feeName,
        db
      )
    }
  }
}

export const studentLedgerService = new StudentLedgerService()