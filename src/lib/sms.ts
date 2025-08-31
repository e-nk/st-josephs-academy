import AfricasTalking from 'africastalking'

interface SMSMessage {
  to: string
  message: string
}

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
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '')
    
    // Handle different formats
    if (cleaned.startsWith('254')) {
      // Already in correct format
      return `+${cleaned}`
    } else if (cleaned.startsWith('0')) {
      // Convert 07xxxxxxxx to +254xxxxxxxx
      return `+254${cleaned.substring(1)}`
    } else if (cleaned.length === 9) {
      // Handle 7xxxxxxxx format
      return `+254${cleaned}`
    }
    
    // Default: assume it needs Kenya country code
    return `+254${cleaned}`
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

      if (!this.africastalking) {
        console.error('Africa\'s Talking not initialized - missing credentials')
        return false
      }

      const formattedPhone = this.formatPhoneNumber(to)
      console.log('Original phone:', to, '→ Formatted:', formattedPhone)

      // Validate phone number format
      if (!formattedPhone.match(/^\+254[0-9]{9}$/)) {
        console.error('Invalid phone number format:', formattedPhone)
        return false
      }

      const result = await this.africastalking.SMS.send({
        to: formattedPhone,
        message: message,
      })

      console.log('SMS API Response:', result)
      
      if (result.SMSMessageData && result.SMSMessageData.Recipients) {
        const recipient = result.SMSMessageData.Recipients[0]
        const success = recipient.status === 'Success'
        console.log('SMS Status:', recipient.status, 'Cost:', recipient.cost)
        return success
      }
      
      return false
    } catch (error: any) {
      console.error('Error sending SMS:', error)
      return false
    }
  }

  // Generate payment confirmation message (keep it short for SMS limits)
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
${studentName} (${admissionNumber})
Paid: ${this.formatCurrency(amountPaid)}
${balanceText}
Ref: ${transactionId}`
  }

  // Generate payment receipt message for director
  generateDirectorNotificationSMS(
    studentName: string,
    admissionNumber: string,
    amountPaid: number,
    paymentMethod: string,
    transactionId: string
  ): string {
    return `PAYMENT ALERT - ST. JOSEPH'S ACADEMY
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