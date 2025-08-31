import { Resend } from 'resend'

interface ReceiptData {
  studentName: string
  admissionNumber: string
  class: string
  parentName: string
  parentEmail: string
  amountPaid: number
  newBalance: number
  transactionId: string
  paymentDate: Date
  feeBreakdown: Array<{
    feeName: string
    amountPaid: number
    remainingBalance: number
  }>
}

class EmailService {
  private resend: Resend

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY)
  }

  async sendPaymentReceipt(receiptData: ReceiptData): Promise<boolean> {
    try {
      // For development, just log the email
      if (process.env.NODE_ENV === 'development') {
        console.log('=== EMAIL RECEIPT (Development Mode) ===')
        console.log('To:', receiptData.parentEmail)
        console.log('CC:', process.env.DIRECTOR_EMAIL)
        console.log('Subject: Payment Receipt - St. Joseph\'s Central Academy-Sironoi')
        console.log('Student:', receiptData.studentName)
        console.log('Amount:', receiptData.amountPaid)
        console.log('Transaction ID:', receiptData.transactionId)
        console.log('New Balance:', receiptData.newBalance)
        console.log('=========================================')
        return true
      }

      const result = await this.resend.emails.send({
        from: process.env.FROM_EMAIL || 'fees@stjosephs.school',
        to: receiptData.parentEmail,
        cc: process.env.DIRECTOR_EMAIL ? [process.env.DIRECTOR_EMAIL] : undefined,
        subject: `Payment Receipt - ${receiptData.studentName} - St. Joseph's Central Academy-Sironoi`,
        html: this.generateReceiptHTML(receiptData),
      })

      console.log('Email sent successfully via Resend:', result.data?.id)
      return true

    } catch (error) {
      console.error('Error sending email receipt via Resend:', error)
      return false
    }
  }

  private generateReceiptHTML(data: ReceiptData): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
      }).format(amount)
    }

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Receipt</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0;
          background-color: #f8f9fa;
        }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { 
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); 
          color: white; 
          padding: 30px 20px; 
          text-align: center; 
        }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .header h2 { margin: 10px 0 0 0; font-size: 18px; font-weight: normal; opacity: 0.9; }
        .content { padding: 30px 20px; }
        .receipt-info { 
          background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
          color: white; 
          padding: 20px; 
          margin: 20px 0; 
          border-radius: 10px; 
          text-align: center;
        }
        .receipt-info h3 { margin: 0 0 15px 0; font-size: 20px; }
        .amount { font-size: 32px; font-weight: bold; margin: 10px 0; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 12px; border: 1px solid #e5e7eb; text-align: left; }
        .table th { background-color: #f8f9fa; font-weight: 600; }
        .table tr:nth-child(even) { background-color: #f8f9fa; }
        .footer { 
          background-color: #f8f9fa; 
          padding: 20px; 
          text-align: center; 
          margin-top: 20px; 
          border-top: 2px solid #e5e7eb;
        }
        .success { color: #059669; font-weight: bold; }
        .warning { color: #dc2626; font-weight: bold; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .info-item { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .info-label { font-weight: 600; color: #374151; margin-bottom: 5px; }
        .info-value { color: #1f2937; }
        @media (max-width: 600px) {
          .info-grid { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>St. Joseph's Central Academy-Sironoi</h1>
          <h2>Official Payment Receipt</h2>
        </div>
        
        <div class="content">
          <div class="receipt-info">
            <h3>✓ Payment Confirmed</h3>
            <div class="amount">${formatCurrency(data.amountPaid)}</div>
            <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
            <p><strong>Date:</strong> ${formatDate(data.paymentDate)}</p>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Student Name</div>
              <div class="info-value">${data.studentName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Admission Number</div>
              <div class="info-value">${data.admissionNumber}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Class</div>
              <div class="info-value">${data.class}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Parent/Guardian</div>
              <div class="info-value">${data.parentName}</div>
            </div>
          </div>

          <h3 style="margin-top: 30px; color: #374151;">Fee Payment Breakdown</h3>
          <table class="table">
            <thead>
              <tr>
                <th>Fee Type</th>
                <th>Amount Paid</th>
                <th>Remaining Balance</th>
              </tr>
            </thead>
            <tbody>
              ${data.feeBreakdown.map(fee => `
                <tr>
                  <td>${fee.feeName}</td>
                  <td>${formatCurrency(fee.amountPaid)}</td>
                  <td>${fee.remainingBalance > 0 ? formatCurrency(fee.remainingBalance) : '<span class="success">Fully Paid</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${data.newBalance > 0 
            ? `<div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
                 <p style="margin: 0; color: #92400e;"><strong>Remaining Balance:</strong> <span class="warning">${formatCurrency(data.newBalance)}</span></p>
                 <p style="margin: 5px 0 0 0; font-size: 14px; color: #92400e;">Please make additional payments to clear the remaining balance.</p>
               </div>`
            : `<div style="background-color: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin: 20px 0;">
                 <p style="margin: 0; color: #047857; font-size: 18px; text-align: center;"><strong>🎉 CONGRATULATIONS! ALL FEES PAID IN FULL</strong></p>
               </div>`
          }
        </div>

        <div class="footer">
          <p><strong>Thank you for your payment!</strong></p>
          <p>This is an automated receipt. Please keep this email for your records.</p>
          <p>For any queries, please contact the school administration.</p>
          <hr style="margin: 15px 0; border: none; border-top: 1px solid #d1d5db;">
          <p style="font-size: 12px; color: #6b7280;">
            St. Joseph's Central Academy-Sironoi Fee Management System<br>
            Generated on ${formatDate(new Date())}
          </p>
        </div>
      </div>
    </body>
    </html>
    `
  }
}

export const emailService = new EmailService()