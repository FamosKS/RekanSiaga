import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { validateDevelopmentEnvironment } from './src/lib/environment.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // Reject wrong projects/privileged credentials before Vite can bundle them.
  validateDevelopmentEnvironment(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)
  return {
    plugins: [react(), tailwindcss()],
    // Generated QA journals and tooling are not application inputs. Watching
    // them can trigger reloads during a live form submission.
    server: { watch: { ignored: ['**/docs/qa/**', '**/.tools/**', '**/scripts/**'] } },
  }
})
