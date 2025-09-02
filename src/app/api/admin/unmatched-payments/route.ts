import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - Fetch all unmatched payments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }

    const [payments, total] = await Promise.all([
      // @ts-ignore - Prisma type issue
      prisma.unmatchedPayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          resolvedBy: {
            select: {
              name: true,
              email: true
            }
          },
          createdPayment: {
            include: {
              student: {
                select: {
                  admissionNumber: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      }),
      // @ts-ignore - Prisma type issue
      prisma.unmatchedPayment.count({ where })
    ])

    return NextResponse.json({
      payments,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: page,
        limit
      }
    })

  } catch (error) {
    console.error('Error fetching unmatched payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}