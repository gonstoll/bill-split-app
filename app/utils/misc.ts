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

export const fetcher = {
  async get(url: string, init?: RequestInit) {
    return await fetch(`${ENV.BASE_URL}/api/${url}`, init)
  },
  async post(url: string, body: unknown, init?: RequestInit) {
    return await fetch(`${ENV.BASE_URL}/api/${url}`, {
      ...init,
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
        ...init?.headers,
      },
    })
  },
}
