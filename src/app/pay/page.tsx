'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface StudentInfo {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  class: string
  parentName: string
  parentPhone: string
  totalOutstanding: number
  feeBreakdown: Array<{
    feeName: string
    balance: number
    dueDate: string | null
  }>
}

export default function PaymentPage() {
  const [admissionNumber, setAdmissionNumber] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const searchStudent = async () => {
    if (!admissionNumber.trim()) {
      setError('Please enter admission number')
      return
    }

    setSearchLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/public/student/${admissionNumber}`)
      const data = await response.json()

      if (response.ok) {
        setStudentInfo(data.student)
        setPhoneNumber(data.student.parentPhone || '')
      } else {
        setError(data.error || 'Student not found')
        setStudentInfo(null)
      }
    } catch (error) {
      setError('Error searching for student. Please try again.')
      setStudentInfo(null)
    } finally {
      setSearchLoading(false)
    }
  }

  const checkPaymentStatus = async (checkoutId: string) => {
    try {
      const response = await fetch(`/api/payment-status/${checkoutId}`)
      const data = await response.json()
      
      if (data.status === 'confirmed') {
        // Payment confirmed - redirect to success page
        const successUrl = `/pay/success?transactionId=${data.transactionId}&amount=${data.amount}&studentName=${encodeURIComponent(data.studentName)}&balance=${studentInfo ? studentInfo.totalOutstanding - data.amount : 0}`
        window.location.href = successUrl
        return true
      } else if (data.status === 'failed') {
        setError('Payment failed. Please try again.')
        setPaymentLoading(false)
        return true
      }
      
      return false // Payment still pending
    } catch (error) {
      console.error('Error checking payment status:', error)
      return false
    }
  }

  const pollPaymentStatus = (checkoutId: string) => {
    const pollInterval = setInterval(async () => {
      const isComplete = await checkPaymentStatus(checkoutId)
      if (isComplete) {
        clearInterval(pollInterval)
      }
    }, 3000) // Check every 3 seconds

    // Stop polling after 5 minutes (100 * 3 seconds)
    setTimeout(() => {
      clearInterval(pollInterval)
      if (paymentLoading) {
        setPaymentLoading(false)
        setError('Payment timeout. Please check your M-Pesa messages and try again if payment was not processed.')
      }
    }, 300000) // 5 minutes
  }

  const initiatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!studentInfo) {
      setError('Please search for student first')
      return
    }

    if (!phoneNumber.trim()) {
      setError('Phone number is required')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    const paymentAmount = parseFloat(amount)
    if (paymentAmount > studentInfo.totalOutstanding) {
      setError(`Amount cannot exceed outstanding balance of ${formatCurrency(studentInfo.totalOutstanding)}`)
      return
    }

    setPaymentLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admissionNumber: studentInfo.admissionNumber,
          phoneNumber: phoneNumber,
          amount: paymentAmount,
        })
      })

      const data = await response.json()

      if (response.ok) {
        setCheckoutRequestId(data.checkoutRequestId)
        setSuccess(`Payment request sent to ${phoneNumber}. Please check your phone and enter your M-Pesa PIN to complete the payment.`)
        setAmount('')
        
        // Start polling for payment status
        pollPaymentStatus(data.checkoutRequestId)
      } else {
        setError(data.error || 'Failed to initiate payment')
        setPaymentLoading(false)
      }
    } catch (error) {
      setError('Network error. Please try again.')
      setPaymentLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date'
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">St. Joseph's Academy</h1>
          <p className="text-gray-600 mt-2">Fee Payment Portal</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Student</CardTitle>
            <CardDescription>
              Enter the student's admission number to view fee details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter admission number (e.g., 2024001)"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchStudent()}
                disabled={paymentLoading}
              />
              <Button 
                onClick={searchStudent} 
                disabled={searchLoading || paymentLoading}
                className="shrink-0"
              >
                {searchLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Searching...
                  </>
                ) : (
                  'Search'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-6 border-red-200">
            <CardContent className="pt-6">
              <div className="text-red-600 text-center">{error}</div>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="mb-6 border-green-200">
            <CardContent className="pt-6">
              <div className="text-green-600 text-center">{success}</div>
              {paymentLoading && (
                <div className="mt-4 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">
                    Waiting for payment confirmation... Please complete the payment on your phone.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {studentInfo && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Student Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {studentInfo.firstName} {studentInfo.lastName}
                  </div>
                  <div>
                    <span className="font-medium">Class:</span> {studentInfo.class}
                  </div>
                  <div>
                    <span className="font-medium">Admission No:</span> {studentInfo.admissionNumber}
                  </div>
                  <div>
                    <span className="font-medium">Parent:</span> {studentInfo.parentName}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Fee Balance</CardTitle>
                <CardDescription>
                  Outstanding fees for this student
                </CardDescription>
              </CardHeader>
              <CardContent>
                {studentInfo.feeBreakdown.length === 0 ? (
                  <p className="text-center text-green-600 py-4">
                    ✓ No outstanding fees. All payments are up to date!
                  </p>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {studentInfo.feeBreakdown.map((fee, index) => (
                        <div key={index} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <span className="font-medium">{fee.feeName}</span>
                            <div className="text-sm text-muted-foreground">
                              Due: {formatDate(fee.dueDate)}
                            </div>
                          </div>
                          <span className="font-medium text-red-600">
                            {formatCurrency(fee.balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total Outstanding:</span>
                        <span className="text-red-600">
                          {formatCurrency(studentInfo.totalOutstanding)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {studentInfo.totalOutstanding > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Make Payment</CardTitle>
                  <CardDescription>
                    Pay via M-Pesa using your mobile phone
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={initiatePayment} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        M-Pesa Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="0722123456"
                        disabled={paymentLoading}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the phone number registered with M-Pesa
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">
                        Amount (KES) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="1"
                        max={studentInfo.totalOutstanding}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount to pay"
                        disabled={paymentLoading}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        You can pay the full amount or make a partial payment
                      </p>
                    </div>

                    <Button type="submit" disabled={paymentLoading} className="w-full">
                      {paymentLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing Payment...
                        </>
                      ) : (
                        'Pay with M-Pesa'
                      )}
                    </Button>
                  </form>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">How to Pay:</h4>
                    <ol className="text-sm text-blue-800 space-y-1">
                      <li>1. Enter your M-Pesa registered phone number</li>
                      <li>2. Enter the amount you want to pay</li>
                      <li>3. Click "Pay with M-Pesa"</li>
                      <li>4. You'll receive an STK push on your phone</li>
                      <li>5. Enter your M-Pesa PIN to complete payment</li>
                      <li>6. You'll be redirected once payment is confirmed</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}