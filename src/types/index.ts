import { PaymentMethod, PaymentStatus } from '@prisma/client'

export interface Student {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  middleName?: string
  class: string
  parentName: string
  parentPhone: string
  parentEmail?: string
  dateOfBirth?: Date
  createdAt: Date
  updatedAt: Date
}

export interface FeeStructure {
  id: string
  name: string
  amount: number
  term?: string
  year: number
  dueDate?: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  studentsAssigned?: number
  totalExpected?: number
  totalCollected?: number
  totalOutstanding?: number
}

export interface Payment {
  id: string
  studentId: string
  amount: number
  paymentMethod: PaymentMethod
  transactionId?: string
  referenceNumber?: string
  status: PaymentStatus
  paidAt?: Date
  confirmedAt?: Date
  receiptSent: boolean
  createdAt: Date
  updatedAt: Date
  student?: Student
}

export interface FeeAssignment {
  id: string
  studentId: string
  feeStructureId: string
  amountDue: number
  amountPaid: number
  balance: number
  status: PaymentStatus
  student?: Student
  feeStructure?: FeeStructure
}

export interface DashboardStats {
  totalStudents: number
  totalCollected: number
  totalOutstanding: number
  paymentsToday: number
  pendingPayments: number
}