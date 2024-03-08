import {getFormProps, getInputProps, useForm} from '@conform-to/react'
import {getZodConstraint, parseWithZod} from '@conform-to/zod'
import type {ActionFunctionArgs} from '@remix-run/node'
import {
  Form,
  Link,
  isRouteErrorResponse,
  json,
  redirect,
  useActionData,
  useNavigation,
  useRouteError,
} from '@remix-run/react'
import {AlertCircle, Loader2} from 'lucide-react'
import {z} from 'zod'
import {ErrorList} from '~/components/error-list'
import {Alert, AlertDescription, AlertTitle} from '~/components/ui/alert'
import {Button} from '~/components/ui/button'
import {Input} from '~/components/ui/input'
import {Label} from '~/components/ui/label'
import {commitSession, getSession} from '~/utils/session.server'
import {entitySchema, knownErrorSchema} from '~/utils/types'

const RegisterSchema = z.object({
  name: z
    .string({required_error: 'Name is required'})
    .trim()
    .min(1, {message: 'Name is required'})
    .max(50, {message: 'Name is too long'}),
  phoneNumber: z
    .string({required_error: 'Phone number is required'})
    .trim()
    .min(8, {message: 'Incorrect phone number format'})
    .max(15, {message: 'Incorrect phone number format'}),
  email: z
    .string({required_error: 'Email is required'})
    .email({message: 'Invalid email address'}),
})

export async function action({request}: ActionFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'))
  const formData = await request.formData()
  const result = parseWithZod(formData, {schema: RegisterSchema})

  if (result.status !== 'success') {
    return json(
      {
        status: 'error',
        result: result.reply(),
      } as const,
      {status: result.status === 'error' ? 400 : 200},
    )
  }

  const body = result.value
  const response = await fetch(
    // 'https://bill-split-31dd42940e62.herokuapp.com/api/Users',
    'http://localhost:5003/api/Users',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {'content-type': 'application/json'},
    },
  )

  if (!response.ok) {
    const parsedError = knownErrorSchema.safeParse(await response.json())
    if (!parsedError.success) {
      throw new Response('Invalid response from server', {status: 500})
    }
    const {detail} = parsedError.data
    return json(
      {
        status: 'error',
        result: result.reply({
          formErrors: [detail],
        }),
      } as const,
      {status: response.status},
    )
  }

  if (response.status === 201) {
    const parsedRegister = entitySchema.safeParse(await response.json())
    if (!parsedRegister.success) {
      throw new Response('Invalid response from server', {status: 500})
    }
    const {id} = parsedRegister.data
    session.set('userId', String(id))
    session.set('email', body.email)
    return redirect('/password', {
      headers: {'set-cookie': await commitSession(session)},
    })
  }
}

export default function RegisterPage() {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const [form, fields] = useForm({
    id: 'register-form',
    constraint: getZodConstraint(RegisterSchema),
    lastResult: actionData?.result,
    onValidate({formData}) {
      return parseWithZod(formData, {schema: RegisterSchema})
    },
  })

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">Register</h1>
        <p className="text-muted-foreground">
          Enter your information to create an account
        </p>
      </div>

      <Form method="post" {...getFormProps(form)}>
        {form.errors?.length ? (
          <div className="mb-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>
                <ErrorList id={form.errorId} errors={form.errors} />
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={fields.name.id}>Name</Label>
            <Input
              {...getInputProps(fields.name, {type: 'text'})}
              autoFocus
              placeholder="John Doe"
            />
            <ErrorList id={fields.name.id} errors={fields.name.errors} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={fields.phoneNumber.id}>Phone</Label>
            <Input
              {...getInputProps(fields.phoneNumber, {type: 'tel'})}
              placeholder="+1 234 567 890"
            />
            <ErrorList
              id={fields.phoneNumber.id}
              errors={fields.phoneNumber.errors}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor={fields.email.id}>Email</Label>
          <Input
            {...getInputProps(fields.email, {type: 'email'})}
            placeholder="johndoe@gmail.com"
          />
          <ErrorList id={fields.email.id} errors={fields.email.errors} />
        </div>

        <Button
          className="mt-4 w-full"
          type="submit"
          name="intent"
          value="register"
          disabled={navigation.state === 'submitting'}
        >
          {navigation.state === 'submitting' ? (
            <Loader2 className="mr-2 animate-spin" />
          ) : null}
          Register
        </Button>
      </Form>

      <div className="mt-6 text-center">
        <p className="text-muted-foreground">Already have an account?</p>
        <Link className="text-dark-foreground underline" to="/login">
          Login
        </Link>
      </div>
    </div>
  )
}

export function ErrorBoundary() {
  const error = useRouteError()

  if (typeof document !== 'undefined') {
    console.error(error)
  }

  if (isRouteErrorResponse(error)) {
    return (
      <div className="flex items-center justify-center">
        <div>
          <h1 className="text-5xl font-bold">Oops!</h1>
          {error.data?.message ? (
            <p className="my-4 text-xl text-muted-foreground">
              {error.data.message}
            </p>
          ) : (
            'An error occurred. Please try again later.'
          )}
          <Link to="/register">
            <Button variant="secondary">Try again</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (error instanceof Error) {
    return (
      <div className="flex items-center justify-center">
        <div>
          <h1 className="text-5xl font-bold">Oops!</h1>
          <p className="my-4 text-xl text-muted-foreground">
            An error occurred. Please try again later.
          </p>
          <Link to="/register">
            <Button variant="secondary">Try again</Button>
          </Link>
        </div>
      </div>
    )
  }

  throw new Error('Unhandled error in error boundary')
}
