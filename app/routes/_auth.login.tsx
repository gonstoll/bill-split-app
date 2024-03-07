import {getFormProps, getInputProps, useForm} from '@conform-to/react'
import {getZodConstraint, parseWithZod} from '@conform-to/zod'
import type {ActionFunctionArgs} from '@remix-run/node'
import {Form, Link, json, redirect, useActionData} from '@remix-run/react'
import {z} from 'zod'
import {ErrorList} from '~/components/error-list'
import {Button} from '~/components/ui/button'
import {Input} from '~/components/ui/input'
import {Label} from '~/components/ui/label'
import {commitSession, getSession} from '~/utils/session.server'

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

const LoginResponseSchema = z.object({
  token: z.string(),
  expiresOn: z.date(),
})

export async function action({request}: ActionFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'))
  const formData = await request.formData()
  const result = parseWithZod(formData, {schema: LoginSchema})

  if (result.status !== 'success') {
    return json({status: 'error', result: result.reply()} as const, {
      status: result.status === 'error' ? 400 : 200,
    })
  }

  const body = result.value

  const response = await fetch(
    'http://localhost:5003/api/Authorization/login',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {'content-type': 'application/json'},
    },
  )
  if (!response.ok) {
    return json(
      {
        status: 'error',
        result: result.reply({
          formErrors: ['Invalid email or password'],
        }),
      } as const,
      {status: response.status},
    )
  }
  const responseResult = LoginResponseSchema.parse(await response.json())
  session.set('token', responseResult.token)
  session.set('expiresOn', responseResult.expiresOn)
  session.unset('userId')
  session.unset('email')

  throw redirect('/', {
    headers: {'set-cookie': await commitSession(session)},
  })
}

export default function Login() {
  const actionData = useActionData<typeof action>()
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
        <div className="mb-4 flex flex-col gap-2">
          <Label htmlFor={fields.email.id}>Email</Label>
          <Input {...getInputProps(fields.email, {type: 'email'})} autoFocus />
          <div className="min-h-[32px] px-4 pb-3 pt-1">
            <ErrorList id={fields.email.id} errors={fields.email.errors} />
          </div>
        </div>
        <div className="mb-4 flex flex-col gap-2">
          <Label htmlFor={fields.password.id}>Password</Label>
          <Input {...getInputProps(fields.password, {type: 'password'})} />
          <div className="min-h-[32px] px-4 pb-3 pt-1">
            <ErrorList
              id={fields.password.id}
              errors={fields.password.errors}
            />
          </div>
        </div>

        <Button className="w-full" variant="default" type="submit">
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
