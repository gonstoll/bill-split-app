import {vitePlugin as remix} from '@remix-run/dev'
import {installGlobals} from '@remix-run/node'
import {vercelPreset} from '@vercel/remix/vite'
import {defineConfig} from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import envOnly from 'vite-env-only'

installGlobals()

export default defineConfig({
  plugins: [
    remix({
      presets: [vercelPreset()],
      ignoredRouteFiles: ['**/*.css'],
    }),
    envOnly(),
    tsconfigPaths(),
  ],
})
