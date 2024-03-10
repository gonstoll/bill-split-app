import type {LoaderFunctionArgs} from '@remix-run/node'
import {fetcher} from '~/utils/misc'
import {authenticate} from '~/utils/session.server'

export async function loader({request}: LoaderFunctionArgs) {
  await authenticate(request)
  try {
    const {get} = await fetcher(request)
    const response = await get('Users')
    console.log('logging HEYYYY response: ', response)
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
