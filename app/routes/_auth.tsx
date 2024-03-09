import {Outlet} from '@remix-run/react'

export default function AuthLayout() {
  return (
    <div className="mx-auto mt-6 w-full sm:w-96">
      <Outlet />
    </div>
  )
}
