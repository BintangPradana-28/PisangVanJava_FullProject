import { ofetch } from 'ofetch'

/**
 * Custom ofetch instance for client-side and server-side data fetching.
 * Features:
 * - Request interception (e.g. adding auth headers if needed)
 * - Response interception (e.g. global error handling)
 */
export const api = ofetch.create({
  baseURL: '/',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  async onRequest({ request, options }) {
    // console.log('[API Request]', request, options)
  },
  async onResponseError({ request, response, options }) {
    console.error('[API Error]', request, response.status, response._data)
  },
})
