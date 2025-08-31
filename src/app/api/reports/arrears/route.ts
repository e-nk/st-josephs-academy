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

    const studentsWithArrears = await prisma.student.findMany({
      where: {
        feeAssignments: {
          some: {
            balance: { gt: 0 }
          }
        }
      },
      include: {
        feeAssignments: {
          where: { balance: { gt: 0 } },
          include: {
            feeStructure: {
              select: {
                name: true,
                term: true,
                year: true,
                dueDate: true
              }
            }
          }
        }
      },
      orderBy: [
        { class: 'asc' },
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    })

    const arrearsReport = studentsWithArrears.map(student => {
      const totalBalance = student.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.balance), 0)
      
      return {
        id: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        class: student.class,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        parentEmail: student.parentEmail,
        totalArrears: totalBalance,
        arrearsBreakdown: student.feeAssignments.map(assignment => ({
          feeName: assignment.feeStructure.name,
          balance: Number(assignment.balance),
          term: assignment.feeStructure.term,
          year: assignment.feeStructure.year,
          dueDate: assignment.feeStructure.dueDate
        }))
      }
    })

    const summary = {
      totalStudentsWithArrears: arrearsReport.length,
      totalArrearsAmount: arrearsReport.reduce((sum, student) => sum + student.totalArrears, 0),
      arrearsBreakdownByClass: {} as Record<string, { count: number, amount: number }>
    }

    // Group by class for summary
    arrearsReport.forEach(student => {
      if (!summary.arrearsBreakdownByClass[student.class]) {
        summary.arrearsBreakdownByClass[student.class] = { count: 0, amount: 0 }
      }
      summary.arrearsBreakdownByClass[student.class].count += 1
      summary.arrearsBreakdownByClass[student.class].amount += student.totalArrears
    })

    return NextResponse.json({
      summary,
      students: arrearsReport
    })

  } catch (error) {
    console.error('Error generating arrears report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}