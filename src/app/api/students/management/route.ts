import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const classFilter = searchParams.get('class')

    const where: any = {}
    if (status) where.status = status
    if (classFilter) where.class = classFilter

    const students = await prisma.student.findMany({
      where,
      include: {
        feeAssignments: {
          select: {
            balance: true
          }
        }
      },
      orderBy: [
        { class: 'asc' },
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    })

    const studentsWithBalance = students.map(student => ({
      ...student,
      totalBalance: student.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.balance), 0)
    }))

    return NextResponse.json({ students: studentsWithBalance })

  } catch (error) {
    console.error('Error fetching students for management:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}