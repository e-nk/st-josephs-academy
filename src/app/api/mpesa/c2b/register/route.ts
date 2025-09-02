import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { mpesaC2BService } from '@/lib/mpesa-c2b'

// Register C2B URLs with M-Pesa
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Attempting to register C2B URLs...')
    
    const result = await mpesaC2BService.registerC2BUrls()
    
    return NextResponse.json({
      success: true,
      message: 'C2B URLs registered successfully',
      result
    })

  } catch (error: any) {
    console.error('C2B registration failed:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Registration failed' 
    }, { status: 500 })
  }
}

// Test C2B payment simulation (sandbox only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (process.env.MPESA_ENVIRONMENT !== 'sandbox') {
      return NextResponse.json({ 
        error: 'Simulation only available in sandbox' 
      }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const phoneNumber = searchParams.get('phone') || '254722000000'
    const amount = parseFloat(searchParams.get('amount') || '100')
    const admissionNumber = searchParams.get('admission') || '2024001'

    console.log('Simulating C2B payment:', { phoneNumber, amount, admissionNumber })
    
    const result = await mpesaC2BService.simulateC2BPayment(phoneNumber, amount, admissionNumber)
    
    return NextResponse.json({
      success: true,
      message: 'C2B payment simulated successfully',
      result,
      note: 'Check your confirmation endpoint logs for the callback'
    })

  } catch (error: any) {
    console.error('C2B simulation failed:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Simulation failed' 
    }, { status: 500 })
  }
}