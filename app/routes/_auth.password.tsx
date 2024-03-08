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
import {ErrorList} from '~/components/error-list'
import {Button} from '~/components/ui/button'
import {Input} from '~/components/ui/input'
import {Label} from '~/components/ui/label'
import {commitSession, destroySession, getSession} from '~/utils/session.server'
import {knownErrorSchema} from '~/utils/types'

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

const IntentSchema = z.object({
  intent: z.union([z.literal('set-password'), z.literal('register')]),
})

export async function loader({request}: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')
  if (!userId) {
    return redirect('/register', {status: 401})
  }
  return json({userId: session.get('userId'), email: session.get('email')})
}

export async function action({request}: ActionFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'))
  const formData = await request.formData()
  const intentResult = parseWithZod(formData, {schema: IntentSchema})
  const userId = session.get('userId')
  const email = session.get('email')

  if (!userId || !email) {
    return redirect('/register', {status: 401})
  }

  if (intentResult.status !== 'success') {
    return json(
      {
        status: 'error',
        result: intentResult.reply(),
      } as const,
      {status: intentResult.status === 'error' ? 400 : 200},
    )
  }

  const {intent} = intentResult.value

  if (intent === 'register') {
    return redirect('/redirect', {
      headers: {'set-cookie': await destroySession(session)},
    })
  }

  if (intent === 'set-password') {
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
    const response = await fetch(
      'http://localhost:5003/api/Authorization/password',
      {
        method: 'POST',
        body: JSON.stringify({...body, userId}),
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

    // Registration is done, we now perform the login for the user
    if (response.status === 204) {
      const response = await fetch(
        'http://localhost:5003/api/Authorization/login',
        {
          method: 'POST',
          body: JSON.stringify({email, password: body.password}),
          headers: {'content-type': 'application/json'},
        },
      )
      // TODO: Handle this better
      const data = (await response.json()) as {token: string; expiresOn: Date}

      session.set('token', data.token)
      session.set('expiresOn', data.expiresOn)
      session.unset('userId')
      session.unset('email')

      return redirect('/', {
        headers: {'set-cookie': await commitSession(session)},
      })
    }
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
        <div className="flex flex-col gap-2">
          <Label htmlFor={fields.password.id}>Password</Label>
          <Input
            {...getInputProps(fields.password, {type: 'password'})}
            autoFocus
          />
          <ErrorList id={fields.password.id} errors={fields.password.errors} />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor={fields.passwordCheck.id}>Repeat password</Label>
          <Input {...getInputProps(fields.passwordCheck, {type: 'password'})} />
          <ErrorList
            id={fields.passwordCheck.id}
            errors={fields.passwordCheck.errors}
          />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            className="flex-1"
            variant="outline"
            name="intent"
            value="register"
            type="submit"
          >
            Register
          </Button>
          <Button
            className="flex-1"
            name="intent"
            value="set-password"
            type="submit"
          >
            Set password
          </Button>
        </div>
      </Form>
    </div>
  )
}
