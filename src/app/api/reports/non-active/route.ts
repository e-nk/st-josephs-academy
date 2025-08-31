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
    const statusFilter = searchParams.get('status') // GRADUATED, TRANSFERRED, WITHDRAWN
    const graduationYear = searchParams.get('graduationYear')

    const where: any = {
      status: { not: 'ACTIVE' } // All non-active students
    }

    if (statusFilter) {
      where.status = statusFilter
    }

    if (graduationYear) {
      where.graduationYear = parseInt(graduationYear)
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        feeAssignments: {
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
        },
        payments: {
          where: { status: 'CONFIRMED' },
          orderBy: { confirmedAt: 'desc' }
        }
      },
      orderBy: [
        { graduationYear: 'desc' }, // Most recent first
        { status: 'asc' }, // Then by status
        { class: 'asc' }, // Then by last class
        { lastName: 'asc' }
      ]
    })

    const nonActiveReport = students.map(student => {
      const totalDue = student.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.amountDue), 0)
      const totalPaid = student.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.amountPaid), 0)
      const totalBalance = student.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.balance), 0)
      
      return {
        id: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        lastClass: student.class, // Their final class
        status: student.status,
        graduationYear: student.graduationYear,
        currentAcademicYear: student.currentAcademicYear,
        notes: student.notes,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        parentEmail: student.parentEmail,
        totalDue,
        totalPaid,
        totalBalance,
        paymentStatus: totalBalance === 0 ? 'PAID_FULL' : totalBalance < totalDue ? 'PARTIAL' : 'UNPAID',
        lastPaymentDate: student.payments[0]?.confirmedAt || null,
        updatedAt: student.updatedAt, // When status was last changed
        feeBreakdown: student.feeAssignments.map(assignment => ({
          feeName: assignment.feeStructure.name,
          amountDue: Number(assignment.amountDue),
          amountPaid: Number(assignment.amountPaid),
          balance: Number(assignment.balance),
          term: assignment.feeStructure.term,
          year: assignment.feeStructure.year,
          dueDate: assignment.feeStructure.dueDate
        }))
      }
    })

    // Get available graduation years for filtering
    const graduationYears = await prisma.student.findMany({
      where: { 
        status: { not: 'ACTIVE' },
        graduationYear: { not: null }
      },
      select: { graduationYear: true },
      distinct: ['graduationYear'],
      orderBy: { graduationYear: 'desc' }
    })

    const summary = {
      totalNonActiveStudents: students.length,
      graduatedCount: nonActiveReport.filter(s => s.status === 'GRADUATED').length,
      transferredCount: nonActiveReport.filter(s => s.status === 'TRANSFERRED').length,
      withdrawnCount: nonActiveReport.filter(s => s.status === 'WITHDRAWN').length,
      studentsWithArrears: nonActiveReport.filter(s => s.totalBalance > 0).length,
      totalOutstandingAmount: nonActiveReport.reduce((sum, s) => sum + s.totalBalance, 0),
      fullyPaidCount: nonActiveReport.filter(s => s.totalBalance === 0).length,
      availableGraduationYears: graduationYears.map(y => y.graduationYear).filter(Boolean)
    }

    return NextResponse.json({
      summary,
      students: nonActiveReport
    })

  } catch (error) {
    console.error('Error generating non-active students report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}