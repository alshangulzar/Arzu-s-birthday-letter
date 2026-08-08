import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  // The Supabase → Vercel integration sets NEXT_PUBLIC_SUPABASE_* rather than
  // VITE_SUPABASE_*. Exposing those prefixes too means the app picks up the
  // keys whichever way they were added — by the integration or by hand.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'SUPABASE_'],
})
