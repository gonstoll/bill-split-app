import {type Session, type SessionData, redirect} from '@remix-run/node'
import {z} from 'zod'
import {
  type SessionFlashData,
  commitSession,
  destroySession,
  getSession,
} from './session.server'

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

const LoginResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string(),
  expiresOn: z.string(),
})

export class Api {
  private session: Session<SessionData, SessionFlashData> | undefined

  constructor(private request: Request) {}

  private async init() {
    this.session = await getSession(this.request.headers.get('Cookie'))
  }

  private async refreshToken() {
    const body = {
      token: this.session?.get('token'),
      refreshToken: this.session?.get('refreshToken'),
    }
    const response = await this.post('Authorization/refresh', body)
    const data = await response.json()

    if (!response.ok) {
      throw redirect('/login', {
        headers: this.session
          ? {'set-cookie': await destroySession(this.session)}
          : {},
      })
    }

    return LoginResponseSchema.parse(data)
  }

  /**
   * This function is used to authenticate the user and refresh the token if it's expired.
   *
   * - If there is no token in the session (meaning the user is not authenticated), it will redirect to the login page.
   *
   * - If the token is expired, it will refresh it and return the new token.
   *
   * - If the token refreshing fails, it will redirect to the login page and destroy the session.
   */
  async authenticate() {
    await this.init()

    try {
      const token = this.session?.get('token')
      const expiresOn = this.session?.get('expiresOn')

      if (!token) throw redirect('/login')
      if (expiresOn && new Date(expiresOn) < new Date()) {
        throw new AuthenticationError('Token expired')
      }

      return token
    } catch (error) {
      if (error instanceof AuthenticationError) {
        console.info('Token expired, refreshing...')
        const {
          token: newToken,
          refreshToken: _refreshToken,
          expiresOn,
        } = await this.refreshToken()

        // update the session with the new values
        this.session?.set('token', newToken)
        this.session?.set('refreshToken', _refreshToken)
        this.session?.set('expiresOn', expiresOn)

        // commit the session and append the Set-Cookie header
        const headers = new Headers()
        if (this.session) {
          headers.append('set-cookie', await commitSession(this.session))
        }

        // redirect to the same URL if the request was a GET (loader)
        if (this.request.method === 'GET') {
          throw redirect(this.request.url, {headers})
        }

        return newToken
      }

      // throw again any unexpected error that could've happened
      throw error
    }
  }

  async get(url: string, init?: Omit<RequestInit, 'body'>) {
    await this.init()
    const token = this.session?.get('token')

    return await fetch(`${ENV.BASE_URL}/api/${url}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
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
    const token = this.session?.get('token')

    return await fetch(`${ENV.BASE_URL}/api/${url}`, {
      ...init,
      method: 'POST',
      body: body ? JSON.stringify(body) : null,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    })
  }
}
