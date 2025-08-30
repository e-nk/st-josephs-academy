import axios from 'axios'

interface MpesaTokenResponse {
  access_token: string
  expires_in: string
}

interface MpesaPaymentRequest {
  BusinessShortCode: string
  Password: string
  Timestamp: string
  TransactionType: string
  Amount: number
  PartyA: string // Phone number
  PartyB: string // Business short code
  PhoneNumber: string
  CallBackURL: string
  AccountReference: string // Student admission number
  TransactionDesc: string
}

class MpesaService {
  private baseUrl: string
  private consumerKey: string
  private consumerSecret: string
  private businessShortCode: string
  private passkey: string
  private callbackUrl: string

  constructor() {
    this.baseUrl = process.env.MPESA_ENVIRONMENT === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'
    
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || ''
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || ''
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE || ''
    this.passkey = process.env.MPESA_PASSKEY || ''
    this.callbackUrl = process.env.MPESA_CALLBACK_URL || ''
  }

  private async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64')
      
      const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      })

      return response.data.access_token
    } catch (error) {
      console.error('Error getting M-Pesa access token:', error)
      throw new Error('Failed to get M-Pesa access token')
    }
  }

  private generatePassword(): { password: string, timestamp: string } {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)
    const password = Buffer.from(`${this.businessShortCode}${this.passkey}${timestamp}`).toString('base64')
    
    return { password, timestamp }
  }

  async initiateSTKPush(phoneNumber: string, amount: number, admissionNumber: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken()
      const { password, timestamp } = this.generatePassword()

      // Format phone number (ensure it starts with 254)
      const formattedPhone = phoneNumber.startsWith('254') ? phoneNumber : `254${phoneNumber.substring(1)}`

      const requestData: MpesaPaymentRequest = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: this.businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackUrl,
        AccountReference: admissionNumber,
        TransactionDesc: `Fee payment for student ${admissionNumber}`
      }

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data
    } catch (error) {
      console.error('Error initiating STK push:', error)
      throw error
    }
  }

  async queryPaymentStatus(checkoutRequestId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken()
      const { password, timestamp } = this.generatePassword()

      const requestData = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      }

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data
    } catch (error) {
      console.error('Error querying payment status:', error)
      throw error
    }
  }
}

export const mpesaService = new MpesaService()