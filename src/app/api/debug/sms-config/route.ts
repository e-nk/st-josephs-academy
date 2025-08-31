import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      hasApiKey: !!process.env.SMS_API_KEY,
      apiKeyLength: process.env.SMS_API_KEY?.length || 0,
      apiKeyPrefix: process.env.SMS_API_KEY?.substring(0, 8) || 'none',
      username: process.env.SMS_USERNAME || 'none',
      nodeEnv: process.env.NODE_ENV
    })

  } catch (error) {
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 })
  }
}