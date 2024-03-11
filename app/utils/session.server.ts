import {createCookieSessionStorage} from '@remix-run/node'

export type SessionData = {
  userId: string
  email: string
  token: string
  refreshToken: string
  expiresOn: string
}

export type SessionFlashData = {
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
