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

      // Format phone number - Africa's Talking SDK handles this better
      const formattedPhone = to.startsWith('+') ? to : `+${to}`
      
      console.log('Sending SMS via Africa\'s Talking SDK to:', formattedPhone)

      const result = await this.africastalking.SMS.send({
        to: formattedPhone,
        message: message,
        // from: 'SJAS' // Optional: Your sender ID if you have one registered
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