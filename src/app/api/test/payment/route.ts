import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Simulate M-Pesa payment for testing
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { admissionNumber, amount, phoneNumber } = await request.json()
    
    // Generate test transaction ID
		const transactionId = `TEST${Date.now()}`
		const transactionDate = new Date().toISOString() // Use proper ISO string instead

				// Simulate M-Pesa callback format
    const callbackData = {
      Body: {
        stkCallback: {
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: amount },
              { Name: 'MpesaReceiptNumber', Value: transactionId },
              { Name: 'TransactionDate', Value: transactionDate },
              { Name: 'PhoneNumber', Value: phoneNumber },
              { Name: 'AccountReference', Value: admissionNumber }
            ]
          }
        }
      }
    }

    // Call our callback endpoint
    const callbackResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/mpesa/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callbackData)
    })
    
    const result = await callbackResponse.json()
    
    return NextResponse.json({
      message: 'Test payment processed',
      transactionId,
      result
    })

  } catch (error) {
    console.error('Error processing test payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}