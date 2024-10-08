import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaDescriptor,
} from '@remix-run/node'
import {
  Form,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  json,
  redirect,
  useLoaderData,
} from '@remix-run/react'
import {GeneralErrorBoundary} from './components/error-boundary'
import {Button} from './components/ui/button'
import styles from './globals.css?url'
import {cn} from './lib/utils'
import {ThemeSwitch, useTheme} from './routes/action.set-theme'
import {Api} from './utils/auth.server'
import {ClientHintCheck, getHints} from './utils/client-hints'
import {getEnv} from './utils/env.server'
import {useNonce} from './utils/nonce-provider'
import {destroySession, getSession} from './utils/session.server'
import {getTheme, type Theme} from './utils/theme.server'

export function links() {
  return [{rel: 'stylesheet', href: styles}]
}

export function meta(): Array<MetaDescriptor> {
  return [
    {title: 'BillSplit'},
    {name: 'description', content: 'Welcome to BillSplit'},
  ]
}

export async function loader({request}: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'))
  const token = session.get('token')

  return json({
    hints: getHints(request),
    theme: getTheme(request),
    isAuthenticated: Boolean(token),
    ENV: getEnv(),
  })
}

export async function action({request}: ActionFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'))
  const api = new Api(request)
  await api.authenticate()
  await api.post('Authorization/logout')
  return redirect('/login', {
    headers: {'set-cookie': await destroySession(session)},
  })
}

function Document({
  theme = 'light',
  nonce,
  children,
}: {
  theme?: Theme
  nonce: string
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn(theme, 'h-full')}>
      <head>
        <ClientHintCheck nonce={nonce} />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="color-scheme"
          content={theme === 'dark' ? 'dark light' : 'light dark'}
        />
        <Meta />
        <Links />
      </head>
      <body className="flex h-full flex-col bg-background text-foreground">
        <ThemeSwitch />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  const data = useLoaderData<typeof loader>()
  const theme = useTheme()
  const nonce = useNonce()

  return (
    <Document theme={theme} nonce={nonce}>
      <main className="flex flex-1 flex-col p-6">
        {data.isAuthenticated ? (
          <Form method="post">
            <Button>Logout</Button>
          </Form>
        ) : null}
        <Outlet />
      </main>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.ENV = ${JSON.stringify(data.ENV)}`,
        }}
      />
    </Document>
  )
}

export function ErrorBoundary() {
  const nonce = useNonce()

  return (
    <Document nonce={nonce}>
      <main className="flex flex-1 flex-col items-center justify-center">
        <GeneralErrorBoundary />
      </main>
    </Document>
  )
}
