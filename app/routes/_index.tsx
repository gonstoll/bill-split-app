import type {LoaderFunctionArgs} from '@remix-run/node'
import {Api} from '~/utils/auth.server'

export async function loader({request}: LoaderFunctionArgs) {
  const api = new Api(request)
  await api.authenticate()
  try {
    const response = await api.get('Users')
    const data = await response.json()
    console.log('logging data: ', data)
  } catch (error) {
    console.error(error)
    throw error
  }
  return null
}

export default function Index() {
  return (
    <div>
      <h1>Hello world!</h1>
    </div>
  )
}
