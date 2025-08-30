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
  PartyA: string
  PartyB: string
  PhoneNumber: string
  CallBackURL: string
  AccountReference: string
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

  private checkCredentials(): { valid: boolean, missing: string[] } {
    const missing = []
    if (!this.consumerKey) missing.push('MPESA_CONSUMER_KEY')
    if (!this.consumerSecret) missing.push('MPESA_CONSUMER_SECRET')
    if (!this.businessShortCode) missing.push('MPESA_BUSINESS_SHORT_CODE')
    if (!this.passkey) missing.push('MPESA_PASSKEY')
    if (!this.callbackUrl) missing.push('MPESA_CALLBACK_URL')
    
    return { valid: missing.length === 0, missing }
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
    } catch (error: any) {
      console.error('Error getting M-Pesa access token:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
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
      // Check if we have all required credentials
      const credentialCheck = this.checkCredentials()
      if (!credentialCheck.valid) {
        throw new Error(`Missing M-Pesa credentials: ${credentialCheck.missing.join(', ')}`)
      }

      const accessToken = await this.getAccessToken()
      const { password, timestamp } = this.generatePassword()

      // Format phone number (ensure it starts with 254)
      let formattedPhone = phoneNumber.replace(/\D/g, '') // Remove non-digits
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.substring(1)
      } else if (!formattedPhone.startsWith('254')) {
        formattedPhone = '254' + formattedPhone
      }

      const requestData: MpesaPaymentRequest = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount), // Ensure it's an integer
        PartyA: formattedPhone,
        PartyB: this.businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackUrl,
        AccountReference: admissionNumber,
        TransactionDesc: `Fee payment for student ${admissionNumber}`
      }

      console.log('M-Pesa STK Push Request:', {
        ...requestData,
        Password: '[HIDDEN]'
      })

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

      console.log('M-Pesa STK Push Response:', response.data)
      return response.data
      
    } catch (error: any) {
      console.error('Error initiating STK push:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
      
      // Return a more helpful error message
      if (error.response?.data) {
        throw new Error(error.response.data.errorMessage || error.response.data.message || 'M-Pesa API error')
      }
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
    } catch (error: any) {
      console.error('Error querying payment status:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
      throw error
    }
  }
}

export const mpesaService = new MpesaService()