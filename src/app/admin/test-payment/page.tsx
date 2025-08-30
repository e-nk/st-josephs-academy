'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Student } from '@/types'

export default function TestPaymentPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [amount, setAmount] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students?limit=50')
      const data = await response.json()
      if (response.ok) {
        setStudents(data.students)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const handleTestPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const student = students.find(s => s.id === selectedStudent)
    if (!student) {
      alert('Please select a student')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admissionNumber: student.admissionNumber,
          amount: parseFloat(amount),
          phoneNumber: phoneNumber || '254722000000'
        })
      })

      const data = await response.json()
      setResult(data)

    } catch (error) {
      console.error('Error processing test payment:', error)
      setResult({ error: 'Network error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Test Payment System</h2>
        <p className="text-muted-foreground">
          Simulate M-Pesa payments for testing purposes
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Simulate Payment</CardTitle>
            <CardDescription>
              Test the payment processing system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTestPayment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student">Student</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.admissionNumber} - {student.firstName} {student.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (KES)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5000.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="254722000000"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Processing...' : 'Simulate Payment'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Result</CardTitle>
            <CardDescription>
              Payment processing result
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-3">
                {result.error ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-800 font-medium">Error:</p>
                    <p className="text-red-600">{result.error}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-800 font-medium">Success!</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p><strong>Transaction ID:</strong> {result.transactionId}</p>
                      <p><strong>Message:</strong> {result.message}</p>
                    </div>
                  </div>
                )}
                
                {result.result && (
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <p className="font-medium text-gray-800">Processing Details:</p>
                    <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No test results yet. Run a payment simulation to see the results.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. <strong>Select a student</strong> who has outstanding fees assigned</p>
          <p>2. <strong>Enter an amount</strong> (can be partial or full payment)</p>
          <p>3. <strong>Click "Simulate Payment"</strong> to test the system</p>
          <p>4. <strong>Check the dashboard</strong> to see updated balances</p>
          <p>5. The system will automatically allocate payments to outstanding fees</p>
        </CardContent>
      </Card>
    </div>
  )
}