import {getFormProps, getInputProps, useForm} from '@conform-to/react'
import {getZodConstraint, parseWithZod} from '@conform-to/zod'
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from '@remix-run/node'
import {Form, useActionData} from '@remix-run/react'
import {z} from 'zod'
import {GeneralErrorBoundary} from '~/components/error-boundary'
import {ErrorList} from '~/components/error-list'
import {Button} from '~/components/ui/button'
import {Input} from '~/components/ui/input'
import {Label} from '~/components/ui/label'
import {fetcher} from '~/utils/misc'
import {commitSession, getSession} from '~/utils/session.server'
import {knownErrorSchema} from '~/utils/types'
import {LoginResponseSchema} from './_auth.login'

const PasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, {message: 'Password must contain at least 6 characters'}),
    passwordCheck: z
      .string()
      .min(6, {message: 'Password must contain at least 6 characters'}),
  })
  .refine(
    schema => schema.password === schema.passwordCheck,
    'Passwords must match',
  )

export async function loader({request}: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')
  if (!userId) {
    throw redirect('/register')
  }
  return json({userId, email: session.get('email')})
}

export async function action({request}: ActionFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'))
  const formData = await request.formData()
  const userId = session.get('userId')
  const email = session.get('email')

  if (!userId || !email) {
    return redirect('/register', {status: 401})
  }

  const result = parseWithZod(formData, {schema: PasswordSchema})

  if (result.status !== 'success') {
    return json(
      {
        type: 'error',
        result: result.reply({
          formErrors: ["Passwords don't match"],
        }),
      } as const,
      {status: result.status === 'error' ? 400 : 200},
    )
  }

  const body = result.value
  const response = await fetcher.post('Authorization/password', {
    ...body,
    userId,
  })

  if (!response.ok) {
    const parsedError = knownErrorSchema.safeParse(await response.json())
    if (!parsedError.success) {
      throw new Response('Invalid response from server', {status: 500})
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

  // Registration is done, we now perform the login for the user
  if (response.status === 204) {
    const response = await fetcher.post('Authorization/login', {
      email,
      password: body.password,
    })

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
}

export default function PasswordForm() {
  const actionData = useActionData<typeof action>()
  const [form, fields] = useForm({
    id: 'password-form',
    constraint: getZodConstraint(PasswordSchema),
    lastResult: actionData?.result,
    onValidate({formData}) {
      return parseWithZod(formData, {schema: PasswordSchema})
    },
  })

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">Register</h1>
        <p className="text-muted-foreground">
          Create a password for your account
        </p>
      </div>

      <Form method="post" {...getFormProps(form)}>
        <div className="mb-4 flex flex-col gap-2">
          <Label htmlFor={fields.password.id}>Password</Label>
          <Input
            {...getInputProps(fields.password, {type: 'password'})}
            autoFocus
          />
          <ErrorList id={fields.password.id} errors={fields.password.errors} />
        </div>
        <div className="mb-4 flex flex-col gap-2">
          <Label htmlFor={fields.passwordCheck.id}>Repeat password</Label>
          <Input {...getInputProps(fields.passwordCheck, {type: 'password'})} />
          <ErrorList
            id={fields.passwordCheck.id}
            errors={fields.passwordCheck.errors}
          />
        </div>

        <Button className="w-full" type="submit">
          Set password
        </Button>
      </Form>
    </div>
  )
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />
}
