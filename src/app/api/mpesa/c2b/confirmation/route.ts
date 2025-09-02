import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { processC2BPayment } from '@/lib/payment-processor'

// M-Pesa C2B Confirmation endpoint
// This is called by M-Pesa after the payment is completed
// We process and store the payment here
export async function POST(request: NextRequest) {
  try {
    console.log('=== M-PESA C2B CONFIRMATION REQUEST ===')
    console.log('Headers:', Object.fromEntries(request.headers.entries()))
    
    const body = await request.json()
    console.log('Confirmation body:', JSON.stringify(body, null, 2))

    // M-Pesa C2B confirmation format is the same as validation
    const {
      TransactionType,
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      MSISDN,
      FirstName,
      MiddleName,
      LastName,
      OrgAccountBalance
    } = body

    // Validate required fields
    if (!TransID || !TransAmount || !BillRefNumber || !MSISDN) {
      console.log('Missing required fields in confirmation')
      return NextResponse.json({
        ResultCode: 'C2B00012',
        ResultDesc: 'Invalid payment data'
      })
    }

    // Check for duplicate transaction
    const existingPayment = await prisma.payment.findFirst({
      where: { transactionId: TransID }
    })

    const existingUnmatched = await prisma.unmatchedPayment.findFirst({
      where: { transactionId: TransID }
    })

    if (existingPayment || existingUnmatched) {
      console.log('Duplicate transaction detected:', TransID)
      return NextResponse.json({
        ResultCode: 'C2B00000',
        ResultDesc: 'Transaction already processed'
      })
    }

    // Parse transaction date from M-Pesa format (YYYYMMDDHHmmss)
    let transactionDate = new Date()
    if (TransTime && TransTime.length >= 14) {
      const year = TransTime.substring(0, 4)
      const month = TransTime.substring(4, 6)
      const day = TransTime.substring(6, 8)
      const hour = TransTime.substring(8, 10)
      const minute = TransTime.substring(10, 12)
      const second = TransTime.substring(12, 14)
      
      transactionDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`)
    }

    // Process the payment
    const paymentData = {
      transactionId: TransID,
      amount: parseFloat(TransAmount),
      accountReference: BillRefNumber?.trim() || '',
      phoneNumber: MSISDN,
      payerName: [FirstName, MiddleName, LastName].filter(Boolean).join(' '),
      transactionDate: transactionDate.toISOString(),
      paymentMethod: 'MPESA' as const
    }

    console.log('Processing C2B payment:', paymentData)
    
    const result = await processC2BPayment(paymentData)
    
    console.log('C2B payment processed:', result)

    return NextResponse.json({
      ResultCode: 'C2B00000',
      ResultDesc: 'Payment processed successfully'
    })

  } catch (error) {
    console.error('Error processing C2B confirmation:', error)
    
    // Always return success to M-Pesa to avoid retries
    // We'll handle errors internally
    return NextResponse.json({
      ResultCode: 'C2B00000',
      ResultDesc: 'Payment received'
    })
  }
}