import {
  Link,
  isRouteErrorResponse,
  useParams,
  useRouteError,
  type ErrorResponse,
} from '@remix-run/react'
import {getErrorMessage} from '~/utils/misc'
import {Button} from './ui/button'

type StatusHandler = (info: {
  error: ErrorResponse
  params: Record<string, string | undefined>
}) => JSX.Element | null

export function GeneralErrorBoundary({
  statusHandlers,
  defaultStatusHandler = ({error}) => (
    <>
      <p className="mb-4 text-muted-foreground">
        Something went wrong. Please try again later.
      </p>
      <pre className="rounded-sm bg-secondary px-4 py-2 text-muted-foreground">
        {error.status} {error.data}
      </pre>
    </>
  ),
  unexpectedErrorHandler = error => (
    <p className="text-muted-foreground">{getErrorMessage(error)}</p>
  ),
}: {
  defaultStatusHandler?: StatusHandler
  statusHandlers?: Record<number, StatusHandler>
  unexpectedErrorHandler?: (error: unknown) => JSX.Element | null
}) {
  const error = useRouteError()
  const params = useParams()

  if (typeof document !== 'undefined') {
    console.error(error)
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <h1 className="text-5xl font-bold">Oh no!</h1>
      <div className="mt-4 flex flex-col items-center gap-4">
        <div>
          {isRouteErrorResponse(error)
            ? (statusHandlers?.[error.status] ?? defaultStatusHandler)({
                error,
                params,
              })
            : unexpectedErrorHandler(error)}
        </div>
        <Link to="/">
          <Button variant="outline">Back to home</Button>
        </Link>
      </div>
    </div>
  )
}
