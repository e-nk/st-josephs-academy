import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const promotionSchema = z.object({
  studentIds: z.array(z.string()),
  newClass: z.string().optional(),
  newStatus: z.enum(['ACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN']),
  academicYear: z.number(),
  notes: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = promotionSchema.parse(body)

    const results = await prisma.$transaction(async (tx) => {
      const updates = []

      for (const studentId of validatedData.studentIds) {
        const updateData: any = {
          status: validatedData.newStatus,
          currentAcademicYear: validatedData.academicYear,
          updatedAt: new Date()
        }

        if (validatedData.newClass) {
          updateData.class = validatedData.newClass
        }

        if (validatedData.newStatus === 'GRADUATED') {
          updateData.graduationYear = validatedData.academicYear
        }

        if (validatedData.notes) {
          updateData.notes = validatedData.notes
        }

        const updated = await tx.student.update({
          where: { id: studentId },
          data: updateData,
          select: {
            id: true,
            admissionNumber: true,
            firstName: true,
            lastName: true,
            class: true,
            status: true
          }
        })

        updates.push(updated)
      }

      return updates
    })

    return NextResponse.json({
      message: `Updated ${results.length} students`,
      updatedStudents: results
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error in student promotion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}