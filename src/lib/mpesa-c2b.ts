import axios from 'axios'

interface C2BRegisterResponse {
  ResponseDescription: string
  ResponseCode: string
}

class MpesaC2BService {
  private baseUrl: string
  private consumerKey: string
  private consumerSecret: string
  private businessShortCode: string

  constructor() {
    this.baseUrl = process.env.MPESA_ENVIRONMENT === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'
    
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || ''
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || ''
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE || ''
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
      console.error('Error getting M-Pesa access token:', error.response?.data || error.message)
      throw new Error('Failed to get M-Pesa access token')
    }
  }

  /**
   * Register C2B URLs with M-Pesa
   * This tells M-Pesa where to send payment notifications
   */
  async registerC2BUrls(): Promise<C2BRegisterResponse> {
    try {
      const accessToken = await this.getAccessToken()
      
      // These are the URLs where M-Pesa will send notifications
      const validationUrl = `${process.env.NEXTAUTH_URL}/api/mpesa/c2b/validation`
      const confirmationUrl = `${process.env.NEXTAUTH_URL}/api/mpesa/c2b/confirmation`
      
      const requestData = {
        ShortCode: this.businessShortCode,
        ResponseType: 'Completed', // Only get notifications for completed transactions
        ConfirmationURL: confirmationUrl,
        ValidationURL: validationUrl
      }

      console.log('Registering C2B URLs:', {
        ...requestData,
        baseUrl: this.baseUrl
      })

      const response = await axios.post(
        `${this.baseUrl}/mpesa/c2b/v1/registerurl`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log('C2B Registration Response:', response.data)
      return response.data
      
    } catch (error: any) {
      console.error('Error registering C2B URLs:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
      throw new Error(error.response?.data?.errorMessage || 'Failed to register C2B URLs')
    }
  }

  /**
   * Simulate a C2B payment (sandbox only)
   * Useful for testing
   */
  async simulateC2BPayment(phoneNumber: string, amount: number, accountReference: string): Promise<any> {
    try {
      if (process.env.MPESA_ENVIRONMENT === 'production') {
        throw new Error('C2B simulation is only available in sandbox environment')
      }

      const accessToken = await this.getAccessToken()
      
      // Format phone number
      let formattedPhone = phoneNumber.replace(/\D/g, '')
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.substring(1)
      } else if (!formattedPhone.startsWith('254')) {
        formattedPhone = '254' + formattedPhone
      }

      const requestData = {
        ShortCode: this.businessShortCode,
        CommandID: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        Msisdn: formattedPhone,
        BillRefNumber: accountReference
      }

      console.log('Simulating C2B Payment:', requestData)

      const response = await axios.post(
        `${this.baseUrl}/mpesa/c2b/v1/simulate`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log('C2B Simulation Response:', response.data)
      return response.data
      
    } catch (error: any) {
      console.error('Error simulating C2B payment:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
      throw error
    }
  }
}

export const mpesaC2BService = new MpesaC2BService()