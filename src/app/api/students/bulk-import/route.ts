import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const bulkStudentSchema = z.array(z.object({
  admissionNumber: z.string().min(1, 'Admission number is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  middleName: z.string().optional(),
  class: z.string().min(1, 'Class is required'),
  parentName: z.string().min(1, 'Parent name is required'),
  parentPhone: z.string().min(1, 'Parent phone is required'),
  parentEmail: z.string().email().optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
}))

// POST - Bulk import students
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = bulkStudentSchema.parse(body)

    const results = {
      successful: [] as string[],
      failed: [] as { row: number, admissionNumber: string, error: string }[],
      duplicates: [] as string[]
    }

    // Process each student
    for (let i = 0; i < validatedData.length; i++) {
      const studentData = validatedData[i]
      
      try {
        // Check if admission number already exists
        const existingStudent = await prisma.student.findUnique({
          where: { admissionNumber: studentData.admissionNumber }
        })

        if (existingStudent) {
          results.duplicates.push(studentData.admissionNumber)
          continue
        }

        // Create student
        await prisma.student.create({
          data: {
            admissionNumber: studentData.admissionNumber,
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            middleName: studentData.middleName || null,
            class: studentData.class,
            parentName: studentData.parentName,
            parentPhone: studentData.parentPhone,
            parentEmail: studentData.parentEmail || null,
            dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth) : null,
          }
        })

        results.successful.push(studentData.admissionNumber)

      } catch (error) {
        results.failed.push({
          row: i + 1,
          admissionNumber: studentData.admissionNumber,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: `Import completed. ${results.successful.length} successful, ${results.failed.length} failed, ${results.duplicates.length} duplicates`,
      results
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error in bulk import:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}