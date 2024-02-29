import {json, type ActionFunctionArgs} from '@remix-run/node'
import {useFetcher, useFetchers, useRouteLoaderData} from '@remix-run/react'
import {MoonIcon, SunIcon} from 'lucide-react'
import {Button} from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import type {loader as rootLoader} from '~/root'
import {isValidTheme, setTheme, type Theme} from '~/utils/theme.server'

export async function action({request}: ActionFunctionArgs) {
  const requestText = await request.text()
  const form = new URLSearchParams(requestText)
  const theme = form.get('theme')

  if (!isValidTheme(theme)) {
    return json({success: false, message: `Invalid theme: ${theme}`})
  }

  return json({success: true}, {headers: {'Set-Cookie': setTheme(theme)}})
}

/**
 * @returns (optimistically) the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
export function useTheme() {
  const data = useRouteLoaderData<typeof rootLoader>('root')
  if (!data) throw new Error('No data found for root route')

  const fetchers = useFetchers()
  const themeFetcher = fetchers.find(f => f.formAction === '/action/set-theme')
  const optimisticTheme = themeFetcher?.formData?.get('theme')

  if (optimisticTheme === 'light' || optimisticTheme === 'dark') {
    return optimisticTheme
  }

  return data.theme ?? data.hints.theme
}

export function useOptimisticThemeMode() {}

export function ThemeSwitch() {
  const fetcher = useFetcher()

  function handleThemeChange(theme: Theme) {
    fetcher.submit({theme}, {method: 'post', action: '/action/set-theme'})
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-none dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-none dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleThemeChange('light')}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange('system')}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
