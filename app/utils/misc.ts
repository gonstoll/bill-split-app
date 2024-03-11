import {serverOnly$} from 'vite-env-only'
import {getSession} from './session.server'

/**
 * Does its best to get a string error message from an unknown error.
 */
export function getErrorMessage(error: unknown) {
  if (typeof error === 'string') return error
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }
  console.error('Unable to get error message for error', error)
  return 'Unknown Error'
}

class Api {
  private headers: Headers
  constructor(private request: Request) {
    this.headers = new Headers()
  }

  async init() {
    const session = await getSession(this.request.headers.get('Cookie'))
    const token = session.get('token')
    if (token) {
      this.headers.append('authorization', `Bearer ${token}`)
    } else {
      this.headers.delete('authorization')
    }
  }

  async get(url: string, init?: Omit<RequestInit, 'body'>) {
    await this.init()
    return await fetch(`${ENV.BASE_URL}/api/${url}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...Object.fromEntries(this.headers.entries()),
        ...init?.headers,
      },
    })
  }

  async post(
    url: string,
    body?: Record<string, unknown>,
    init?: Omit<RequestInit, 'body'>,
  ) {
    await this.init()
    return await fetch(`${ENV.BASE_URL}/api/${url}`, {
      ...init,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'content-type': 'application/json',
        ...Object.fromEntries(this.headers.entries()),
        ...init?.headers,
      },
    })
  }
}

export const fetcher = serverOnly$(fetcherFn)!
async function fetcherFn(request?: Request) {
  const session = await getSession(request?.headers.get('Cookie'))
  const token = session.get('token')
  const headers = new Headers()
  if (token) headers.append('authorization', `Bearer ${token}`)

  return {
    async get(url: string, init?: Omit<RequestInit, 'body'>) {
      return await fetch(`${ENV.BASE_URL}/api/${url}`, {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...Object.fromEntries(headers.entries()),
          ...init?.headers,
        },
      })
    },
    async post(
      url: string,
      body?: Record<string, unknown>,
      init?: Omit<RequestInit, 'body'>,
    ) {
      return await fetch(`${ENV.BASE_URL}/api/${url}`, {
        ...init,
        method: 'POST',
        body: body ? JSON.stringify(body) : null,
        headers: {
          'content-type': 'application/json',
          ...Object.fromEntries(headers.entries()),
          ...init?.headers,
        },
      })
    },
  }
}
