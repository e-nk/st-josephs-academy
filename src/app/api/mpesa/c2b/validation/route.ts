import { NextRequest, NextResponse } from 'next/server'

// M-Pesa C2B Validation endpoint
// This is called by M-Pesa before processing the payment
// We can accept or reject the payment here
export async function POST(request: NextRequest) {
  try {
    console.log('=== M-PESA C2B VALIDATION REQUEST ===')
    console.log('Headers:', Object.fromEntries(request.headers.entries()))
    
    const body = await request.json()
    console.log('Validation body:', JSON.stringify(body, null, 2))

    // M-Pesa C2B validation format:
    // {
    //   "TransactionType": "Pay Bill",
    //   "TransID": "RKTQDM7W6S",
    //   "TransTime": "20191122063845",
    //   "TransAmount": "10.00",
    //   "BusinessShortCode": "174379",
    //   "BillRefNumber": "2024001",
    //   "InvoiceNumber": "",
    //   "OrgAccountBalance": "49197.00",
    //   "ThirdPartyTransID": "",
    //   "MSISDN": "254722000000",
    //   "FirstName": "John",
    //   "MiddleName": "J",
    //   "LastName": "Doe"
    // }

    const {
      TransactionType,
      TransID,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      MSISDN,
      FirstName,
      LastName
    } = body

    // Log the payment attempt
    console.log('C2B Payment Validation:', {
      transactionId: TransID,
      amount: TransAmount,
      shortCode: BusinessShortCode,
      accountReference: BillRefNumber,
      phone: MSISDN,
      payer: `${FirstName} ${LastName}`
    })

    // Basic validation
    if (!TransID || !TransAmount || !BillRefNumber) {
      console.log('Invalid payment data - rejecting')
      return NextResponse.json({
        ResultCode: 'C2B00012',
        ResultDesc: 'Invalid payment data'
      })
    }

    // Validate business short code
    if (BusinessShortCode !== process.env.MPESA_BUSINESS_SHORT_CODE) {
      console.log('Invalid business short code - rejecting')
      return NextResponse.json({
        ResultCode: 'C2B00013',
        ResultDesc: 'Invalid business short code'
      })
    }

    // Validate amount (minimum payment)
    const amount = parseFloat(TransAmount)
    if (amount < 1) {
      console.log('Amount too small - rejecting')
      return NextResponse.json({
        ResultCode: 'C2B00014',
        ResultDesc: 'Amount too small'
      })
    }

    // For now, we accept all payments
    // The actual matching logic will happen in the confirmation endpoint
    console.log('Payment validation passed - accepting')
    return NextResponse.json({
      ResultCode: 'C2B00000',
      ResultDesc: 'Accept the service request successfully.'
    })

  } catch (error) {
    console.error('Error in C2B validation:', error)
    
    // In case of error, reject the payment
    return NextResponse.json({
      ResultCode: 'C2B00011',
      ResultDesc: 'System error occurred'
    })
  }
}