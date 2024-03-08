import {useLocation} from '@remix-run/react'
import {GeneralErrorBoundary} from '~/components/error-boundary'

export async function loader() {
  throw new Response('Not found', {status: 404})
}

// This component will never render, but just in case we render the error boundary
export default function NotFound() {
  return <ErrorBoundary />
}

export function ErrorBoundary() {
  const location = useLocation()

  return (
    <GeneralErrorBoundary
      statusHandlers={{
        404: () => (
          <>
            <p className="text-muted-foreground">We can't find this page:</p>
            <pre className="rounded-sm bg-secondary px-4 py-2 text-muted-foreground">
              {location.pathname}
            </pre>
          </>
        ),
      }}
    />
  )
}
