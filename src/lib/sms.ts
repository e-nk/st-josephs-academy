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
    this.apiKey = process.env.SMS_API_KEY || ''
    this.username = process.env.SMS_USERNAME || ''
    this.baseUrl = 'https://api.africastalking.com/version1/messaging'
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      // For development, we'll just log the SMS
      if (process.env.NODE_ENV === 'development') {
        console.log('=== SMS NOTIFICATION (Development Mode) ===')
        console.log(`To: ${to}`)
        console.log(`Message: ${message}`)
        console.log('============================================')
        return true
      }

      // Debug logging (remove in production)
      console.log('SMS Configuration:', {
        username: this.username,
        hasApiKey: !!this.apiKey,
        apiKeyLength: this.apiKey.length,
        baseUrl: this.baseUrl
      })

      // Format phone number for Africa's Talking (should start with +)
      const formattedPhone = to.startsWith('+') ? to : `+${to}`
      console.log('Sending SMS to:', formattedPhone)

      const requestData = {
        username: this.username,
        to: formattedPhone,
        message: message,
      }

      const response = await axios.post(
        this.baseUrl,
        new URLSearchParams(requestData),
        {
          headers: {
            'apiKey': this.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          timeout: 10000, // 10 seconds timeout
        }
      )

      console.log('SMS API Response:', response.data)
      
      if (response.data.SMSMessageData && response.data.SMSMessageData.Recipients) {
        const recipient = response.data.SMSMessageData.Recipients[0]
        const success = recipient.status === 'Success'
        console.log('SMS Status:', recipient.status, 'Cost:', recipient.cost)
        return success
      }
      
      return false
    } catch (error: any) {
      console.error('Error sending SMS:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers ? Object.keys(error.config.headers) : []
        }
      })
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
      : 'PAID IN FULL'

    return `ST. JOSEPH'S ACADEMY
Payment Confirmed
Student: ${studentName} (${admissionNumber})
Amount: ${this.formatCurrency(amountPaid)}
${balanceText}
Ref: ${transactionId}
Thank you!`
  }

  // Generate payment receipt message for director
  generateDirectorNotificationSMS(
    studentName: string,
    admissionNumber: string,
    amountPaid: number,
    paymentMethod: string,
    transactionId: string
  ): string {
    return `ST. JOSEPH'S ACADEMY - PAYMENT RECEIVED
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