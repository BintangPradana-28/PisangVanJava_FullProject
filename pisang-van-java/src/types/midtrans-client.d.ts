/**
 * Type declarations for `midtrans-client` (v1.x)
 *
 * The official Midtrans Node.js SDK is written in plain JavaScript
 * and does not ship TypeScript declarations. This file provides
 * minimal typings for the two classes we use: Snap and CoreApi.
 *
 * @see https://github.com/Midtrans/midtrans-nodejs-client
 */
declare module 'midtrans-client' {
  interface MidtransClientConfig {
    isProduction: boolean
    serverKey: string
    clientKey: string
  }

  interface TransactionDetails {
    order_id: string
    gross_amount: number
  }

  interface SnapTransactionParameter {
    transaction_details: TransactionDetails
    item_details?: Array<{
      id: string
      price: number
      quantity: number
      name: string
    }>
    customer_details?: {
      first_name?: string
      last_name?: string
      email?: string
      phone?: string
    }
    callbacks?: {
      finish?: string
      error?: string
      pending?: string
    }
    [key: string]: unknown
  }

  interface SnapCreateTransactionResponse {
    token: string
    redirect_url: string
  }

  interface TransactionStatusResponse {
    transaction_id: string
    order_id: string
    transaction_status: string
    fraud_status: string
    status_code: string
    gross_amount: string
    payment_type: string
    [key: string]: unknown
  }

  class Snap {
    constructor(config: MidtransClientConfig)
    createTransaction(parameter: SnapTransactionParameter): Promise<SnapCreateTransactionResponse>
    createTransactionToken(parameter: SnapTransactionParameter): Promise<string>
    createTransactionRedirectUrl(parameter: SnapTransactionParameter): Promise<string>
  }

  class CoreApi {
    constructor(config: MidtransClientConfig)
    charge(parameter: Record<string, unknown>): Promise<Record<string, unknown>>
    capture(parameter: Record<string, unknown>): Promise<Record<string, unknown>>
    cardRegister(parameter: Record<string, unknown>): Promise<Record<string, unknown>>
    cardToken(parameter: Record<string, unknown>): Promise<Record<string, unknown>>
    cardPointInquiry(tokenId: string): Promise<Record<string, unknown>>
    transaction: {
      status(transactionId: string): Promise<TransactionStatusResponse>
      statusb2b(transactionId: string): Promise<TransactionStatusResponse>
      approve(transactionId: string): Promise<Record<string, unknown>>
      deny(transactionId: string): Promise<Record<string, unknown>>
      cancel(transactionId: string): Promise<Record<string, unknown>>
      expire(transactionId: string): Promise<Record<string, unknown>>
      refund(
        transactionId: string,
        parameter?: Record<string, unknown>
      ): Promise<Record<string, unknown>>
      refundDirect(
        transactionId: string,
        parameter?: Record<string, unknown>
      ): Promise<Record<string, unknown>>
      notification(notificationJson: Record<string, unknown>): Promise<TransactionStatusResponse>
    }
  }

  const midtransClient: {
    Snap: typeof Snap
    CoreApi: typeof CoreApi
  }

  export default midtransClient
}
