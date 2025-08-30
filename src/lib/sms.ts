import axios from 'axios'

interface SMSMessage {
  to: string
  message: string
}

class SMSService {
  private apiKey: string
  private username: string
  private baseUrl: string

  constructor() {
    // Using Africa's Talking SMS service (popular in Kenya)
    // You can also use other SMS providers
    this.apiKey = process.env.SMS_API_KEY || ''
    this.username = process.env.SMS_USERNAME || ''
    this.baseUrl = 'https://api.africastalking.com/version1/messaging'
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      // For development, we'll just log the SMS
      if (process.env.NODE_ENV === 'development') {
        console.log('=== SMS NOTIFICATION ===')
        console.log(`To: ${to}`)
        console.log(`Message: ${message}`)
        console.log('========================')
        return true
      }

      // Real SMS sending logic (when you have SMS provider credentials)
      const response = await axios.post(
        this.baseUrl,
        {
          username: this.username,
          to: to,
          message: message,
        },
        {
          headers: {
            'apiKey': this.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )

      return response.data.SMSMessageData.Recipients[0].status === 'Success'
    } catch (error) {
      console.error('Error sending SMS:', error)
      return false
    }
  }

  // Generate payment confirmation message
  generatePaymentConfirmationSMS(
    studentName: string,
    admissionNumber: string,
    amountPaid: number,
    newBalance: number,
    transactionId: string
  ): string {
    const balanceText = newBalance > 0 
      ? `Balance: ${this.formatCurrency(newBalance)}`
      : 'No balance - PAID IN FULL'

    return `ST. JOSEPH'S ACADEMY
Fee Payment Confirmed
Student: ${studentName} (${admissionNumber})
Amount Paid: ${this.formatCurrency(amountPaid)}
${balanceText}
Ref: ${transactionId}
Thank you for your payment!`
  }

  // Generate payment receipt message for director
  generateDirectorNotificationSMS(
    studentName: string,
    admissionNumber: string,
    amountPaid: number,
    paymentMethod: string,
    transactionId: string
  ): string {
    return `ST. JOSEPH'S ACADEMY - PAYMENT ALERT
Student: ${studentName} (${admissionNumber})
Amount: ${this.formatCurrency(amountPaid)}
Method: ${paymentMethod}
Ref: ${transactionId}
Time: ${new Date().toLocaleString('en-KE')}`
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }
}

export const smsService = new SMSService()