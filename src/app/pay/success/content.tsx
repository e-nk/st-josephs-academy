'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CheckCircle, ArrowLeft } from 'lucide-react'

export default function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const transactionId = searchParams.get('transactionId')
  const amount = searchParams.get('amount')
  const studentName = searchParams.get('studentName')
  const balance = searchParams.get('balance')

  const formatCurrency = (amount: string | null) => {
    if (!amount) return 'KES 0'
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(parseFloat(amount))
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">St. Joseph's Central Academy-Sironoi</h1>
          <p className="text-gray-600 mt-2">Fee Payment Portal</p>
        </div>

        <Card className="border-green-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-green-700">Payment Successful!</CardTitle>
            <CardDescription>
              Your fee payment has been processed successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Payment Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-green-700">Student:</span>
                    <div className="font-medium">{studentName || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-green-700">Amount Paid:</span>
                    <div className="font-medium">{formatCurrency(amount)}</div>
                  </div>
                  <div>
                    <span className="text-green-700">Transaction ID:</span>
                    <div className="font-mono text-xs">{transactionId || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-green-700">Remaining Balance:</span>
                    <div className="font-medium">
                      {balance && parseFloat(balance) > 0 
                        ? formatCurrency(balance)
                        : <span className="text-green-600">PAID IN FULL ✓</span>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• You will receive an SMS confirmation shortly</li>
                  <li>• An email receipt will be sent to your registered email</li>
                  <li>• The school will be notified of your payment</li>
                  <li>• Your payment will reflect in school records immediately</li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">Important Note</h4>
                <p className="text-sm text-yellow-800">
                  Please save your M-Pesa transaction message as proof of payment. 
                  Transaction ID: <span className="font-mono">{transactionId}</span>
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Link href="/pay" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Make Another Payment
                  </Button>
                </Link>
                <Button 
                  onClick={() => window.print()} 
                  variant="outline"
                  className="flex-1"
                >
                  Print Receipt
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}