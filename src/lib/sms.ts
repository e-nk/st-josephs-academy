import AfricasTalking from 'africastalking'
import axios from 'axios'

class SMSService {
  private africastalking: any

  constructor() {
    const apiKey = process.env.SMS_API_KEY || ''
    const username = process.env.SMS_USERNAME || ''

    if (apiKey && username) {
      this.africastalking = AfricasTalking({
        apiKey: apiKey,
        username: username,
      })
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/\D/g, '')
    
    if (cleaned.startsWith('254')) {
      return `+${cleaned}`
    } else if (cleaned.startsWith('0')) {
      return `+254${cleaned.substring(1)}`
    } else if (cleaned.length === 9) {
      return `+254${cleaned}`
    }
    
    return `+254${cleaned}`
  }

  // Direct HTTP method for debugging
  private async sendSMSHttp(to: string, message: string): Promise<boolean> {
    try {
      const apiKey = process.env.SMS_API_KEY || ''
      const username = process.env.SMS_USERNAME || ''

      console.log('Direct HTTP SMS attempt:', {
        username,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey.length,
        to,
        messageLength: message.length
      })

      const response = await axios.post(
        'https://api.africastalking.com/version1/messaging',
        new URLSearchParams({
          username: username,
          to: to,
          message: message,
        }),
        {
          headers: {
            'apiKey': apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          timeout: 15000,
        }
      )

      console.log('Direct HTTP SMS Response:', response.data)
      return true

    } catch (error: any) {
      console.error('Direct HTTP SMS Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      })
      return false
    }
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('=== SMS NOTIFICATION (Development Mode) ===')
        console.log(`To: ${to}`)
        console.log(`Message: ${message}`)
        console.log('============================================')
        return true
      }

      const formattedPhone = this.formatPhoneNumber(to)
      console.log('Sending SMS:', { original: to, formatted: formattedPhone })

      if (!formattedPhone.match(/^\+254[0-9]{9}$/)) {
        console.error('Invalid phone format:', formattedPhone)
        return false
      }

      // Try SDK first, then fallback to direct HTTP
      try {
        if (this.africastalking) {
          const result = await this.africastalking.SMS.send({
            to: formattedPhone,
            message: message,
          })
          
          console.log('SDK SMS Response:', result)
          
          if (result.SMSMessageData?.Recipients?.[0]?.status === 'Success') {
            return true
          }
        }
      } catch (sdkError) {
        console.log('SDK failed, trying direct HTTP:', sdkError)
      }

      // Fallback to direct HTTP
      return await this.sendSMSHttp(formattedPhone, message)
      
    } catch (error: any) {
      console.error('SMS send failed completely:', error)
      return false
    }
  }

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

    return `ST. JOSEPH'S CENTRAL ACADEMY-SIRONOI
Payment Confirmed
${studentName} (${admissionNumber})
Paid: ${this.formatCurrency(amountPaid)}
${balanceText}
Ref: ${transactionId}`
  }

  generateDirectorNotificationSMS(
    studentName: string,
    admissionNumber: string,
    amountPaid: number,
    paymentMethod: string,
    transactionId: string
  ): string {
    return `PAYMENT ALERT - ST. JOSEPH'S CENTRAL ACADEMY-SIRONOI
${studentName} (${admissionNumber})
Amount: ${this.formatCurrency(amountPaid)}
Method: ${paymentMethod}
Ref: ${transactionId}`
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }
}

export const smsService = new SMSService()