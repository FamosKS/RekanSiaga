import { loadEnv } from 'vite'
import { mkdirSync, writeFileSync } from 'node:fs'
const env = loadEnv('development', process.cwd(), 'VITE_')
if (env.VITE_SUPABASE_URL !== 'https://uiuiouosblyuqgnvfpeh.supabase.co' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '')) throw Error('Expected exact dev URL and publishable key; no file written.')
mkdirSync('integration/flutter', { recursive: true })
writeFileSync('integration/flutter/dev.local.json', JSON.stringify({ SUPABASE_URL: env.VITE_SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY: env.VITE_SUPABASE_PUBLISHABLE_KEY }, null, 2) + '\n')
console.log('Prepared ignored integration/flutter/dev.local.json from the Web dev environment. No key printed.')
