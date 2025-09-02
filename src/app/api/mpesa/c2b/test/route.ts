import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Test endpoint to simulate C2B callbacks
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      amount = 1000, 
      admissionNumber = '2024001', 
      phoneNumber = '254722000000',
      payerName = 'Test Parent'
    } = await request.json()

    // Generate test transaction ID
    const transactionId = `TEST${Date.now()}`
    const transactionTime = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)

    // Simulate M-Pesa C2B confirmation callback format
    const c2bCallbackData = {
      TransactionType: 'Pay Bill',
      TransID: transactionId,
      TransTime: transactionTime,
      TransAmount: amount.toString(),
      BusinessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE,
      BillRefNumber: admissionNumber,
      InvoiceNumber: '',
      OrgAccountBalance: '50000.00',
      ThirdPartyTransID: '',
      MSISDN: phoneNumber,
      FirstName: payerName.split(' ')[0] || 'Test',
      MiddleName: '',
      LastName: payerName.split(' ')[1] || 'Parent'
    }

    console.log('Simulating C2B callback with data:', c2bCallbackData)

    // Call our confirmation endpoint directly
    const confirmationResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/mpesa/c2b/confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(c2bCallbackData)
    })

    const confirmationResult = await confirmationResponse.json()

    return NextResponse.json({
      success: true,
      message: 'C2B payment simulated successfully',
      simulatedData: c2bCallbackData,
      confirmationResult,
      transactionId
    })

  } catch (error: any) {
    console.error('Error simulating C2B payment:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Simulation failed' 
    }, { status: 500 })
  }
}

// GET endpoint for quick testing with URL parameters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const amount = parseFloat(searchParams.get('amount') || '1000')
    const admissionNumber = searchParams.get('admission') || '2024001'
    const phoneNumber = searchParams.get('phone') || '254722000000'
    const payerName = searchParams.get('payer') || 'Test Parent'

    // Call the POST method with the parameters
    return await POST(new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({ amount, admissionNumber, phoneNumber, payerName }),
      headers: request.headers
    }))

  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Test failed' 
    }, { status: 500 })
  }
}