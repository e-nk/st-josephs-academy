import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { smsService } from '@/lib/sms'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { phoneNumber } = await request.json()
    
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
    }

    const testMessage = `Test SMS from St. Joseph's Central Academy-Sironoi Fee System at ${new Date().toLocaleString()}`
    
    const result = await smsService.sendSMS(phoneNumber, testMessage)
    
    return NextResponse.json({
      success: result,
      message: result ? 'SMS sent successfully' : 'SMS failed to send',
      phoneNumber
    })

  } catch (error) {
    console.error('SMS test error:', error)
    return NextResponse.json({ error: 'SMS test failed' }, { status: 500 })
  }
}