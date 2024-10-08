import {getFormProps, getInputProps, useForm} from '@conform-to/react'
import {getZodConstraint, parseWithZod} from '@conform-to/zod'
import type {ActionFunctionArgs} from '@remix-run/node'
import {
  Form,
  Link,
  json,
  redirect,
  useActionData,
  useNavigation,
} from '@remix-run/react'
import {AlertCircle, Loader2} from 'lucide-react'
import {z} from 'zod'
import {GeneralErrorBoundary} from '~/components/error-boundary'
import {ErrorList} from '~/components/error-list'
import {Alert, AlertDescription, AlertTitle} from '~/components/ui/alert'
import {Button} from '~/components/ui/button'
import {Input} from '~/components/ui/input'
import {Label} from '~/components/ui/label'
import {Api} from '~/utils/auth.server'
import {commitSession, getSession} from '~/utils/session.server'
import {knownErrorSchema} from '~/utils/types'

const LoginSchema = z.object({
  email: z
    .string({required_error: 'Email is required'})
    .email({message: 'Incorrect mail format'})
    .trim()
    .min(1, {message: 'Email is required'}),
  password: z
    .string({required_error: 'Password is required'})
    .trim()
    .min(1, {message: 'Password is required'}),
})

export const LoginResponseSchema = z.object({
  token: z.string(),
  expiresOn: z.string(),
  refreshToken: z.string(),
})

export async function action({request}: ActionFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'))
  const formData = await request.formData()
  const result = parseWithZod(formData, {schema: LoginSchema})

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
  const api = new Api(request)
  const response = await api.post('Authorization/login', body)

  if (!response.ok) {
    const parsedError = knownErrorSchema.safeParse(await response.json())
    if (!parsedError.success) {
      throw new Response('Something went wrong', {status: 500})
    }
    const {reasons} = parsedError.data
    return json(
      {
        status: 'error',
        result: result.reply({formErrors: reasons}),
      } as const,
      {status: response.status},
    )
  }

  const responseResult = LoginResponseSchema.safeParse(await response.json())
  if (!responseResult.success) {
    throw new Response('Invalid response from server', {status: 500})
  }
  const {token, expiresOn, refreshToken} = responseResult.data
  session.set('token', token)
  session.set('expiresOn', expiresOn)
  session.set('refreshToken', refreshToken)

  return redirect('/', {
    headers: {'set-cookie': await commitSession(session)},
  })
}

export default function Login() {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'
  const [form, fields] = useForm({
    id: 'login-form',
    constraint: getZodConstraint(LoginSchema),
    lastResult: actionData?.result,
    onValidate({formData}) {
      return parseWithZod(formData, {schema: LoginSchema})
    },
  })

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">Login</h1>
        <p className="text-muted-foreground">
          Enter your email and password to login to your account
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

        <div className="mb-4 flex flex-col gap-2">
          <Label htmlFor={fields.email.id}>Email</Label>
          <Input {...getInputProps(fields.email, {type: 'email'})} autoFocus />
          <ErrorList id={fields.email.id} errors={fields.email.errors} />
        </div>
        <div className="mb-4 flex flex-col gap-2">
          <Label htmlFor={fields.password.id}>Password</Label>
          <Input {...getInputProps(fields.password, {type: 'password'})} />
          <ErrorList id={fields.password.id} errors={fields.password.errors} />
        </div>

        <Button
          className="w-full"
          variant="default"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : null}
          Login
        </Button>
      </Form>

      <div className="mt-6 text-center">
        <p className="text-muted-foreground">Don&apos;t have an account?</p>
        <Link className="text-dark-foreground underline" to="/register">
          Register
        </Link>
      </div>
    </div>
  )
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />
}
