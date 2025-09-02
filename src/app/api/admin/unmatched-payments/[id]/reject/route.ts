import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST - Reject unmatched payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Session user:', session.user)
    
    const { id } = await params
    const { adminNotes } = await request.json()

    // Verify the user exists in the database
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser) {
      console.error('User not found in database:', session.user.id)
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    // Get the unmatched payment
    // @ts-ignore - Prisma type issue
    const unmatchedPayment = await prisma.unmatchedPayment.findUnique({
      where: { id }
    })

    if (!unmatchedPayment) {
      return NextResponse.json({ error: 'Unmatched payment not found' }, { status: 404 })
    }

    if (unmatchedPayment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Payment has already been processed' }, { status: 400 })
    }

    // Mark as rejected
    // @ts-ignore - Prisma type issue
    const rejectedPayment = await prisma.unmatchedPayment.update({
      where: { id },
      data: {
        status: 'REJECTED',
        resolvedById: currentUser.id, // Use the verified user ID
        resolvedAt: new Date(),
        adminNotes: adminNotes || `Payment rejected by ${currentUser.name || currentUser.email} on ${new Date().toISOString()}`
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Payment rejected successfully',
      rejectedPayment
    })

  } catch (error) {
    console.error('Error rejecting unmatched payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}