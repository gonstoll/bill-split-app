import {createCookieSessionStorage, redirect} from '@remix-run/node'
import {z} from 'zod'
import {fetcher} from './misc'

type SessionData = {
  userId: string
  email: string
  token: string
  refreshToken: string
  expiresOn: string
}

type SessionFlashData = {
  error: string
}

export const {getSession, commitSession, destroySession} =
  createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: '__session',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secrets: [process.env.SESSION_SECRET],
    },
  })

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export async function authFetch(
  token: string,
  request: Request,
  url: string,
  init?: RequestInit,
) {
  const session = await getSession(request.headers.get('Cookie'))
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  })

  // Token might still be around, but not valid anymore
  if (response.status === 401 || response.status === 403) {
    throw redirect('/login', {
      headers: {'set-cookie': await destroySession(session)},
    })
  }

  return response
}

const LoginResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string(),
  expiresOn: z.string(),
})

export async function authenticate(request: Request) {
  const session = await getSession(request.headers.get('Cookie'))

  try {
    const token = session.get('token')
    const expiresOn = session.get('expiresOn')

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
      } = await refreshToken({
        token: session.get('token'),
        refreshToken: session.get('refreshToken'),
      })

      // update the session with the new values
      session.set('token', newToken)
      session.set('refreshToken', _refreshToken)
      session.set('expiresOn', expiresOn)

      // commit the session and append the Set-Cookie header
      const headers = new Headers()
      headers.append('set-cookie', await commitSession(session))

      // redirect to the same URL if the request was a GET (loader)
      if (request.method === 'GET') throw redirect(request.url, {headers})

      return newToken
    }

    // throw again any unexpected error that could've happened
    throw error
  }
}

async function refreshToken(body: {token?: string; refreshToken?: string}) {
  const response = await fetcher.post('Authorization/refresh', body)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${data.reasons[0]}`)
  }

  return LoginResponseSchema.parse(data)
}
