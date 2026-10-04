import { request, type FullConfig } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { ADMIN_PHONE, ADMIN_TOKEN_FILE } from './helpers'

/** Logs the admin in once per run (the OTP endpoint allows one code per minute per number). */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!
  const ctx = await request.newContext({ baseURL })
  const health = await ctx.get('/api/categories')
  if (!health.ok()) throw new Error(`Shop is not reachable at ${baseURL}; run "docker compose up -d --build" first.`)

  // Re-run within a minute of the last one: reuse its token if the backend still accepts it (a restart with a
  // random signing key invalidates it), otherwise wait out the one-code-per-minute throttle.
  if (existsSync(ADMIN_TOKEN_FILE)) {
    const me = await ctx.get('/api/me', { headers: { Authorization: `Bearer ${readFileSync(ADMIN_TOKEN_FILE, 'utf8').trim()}` } })
    if (me.ok()) {
      await ctx.dispose()
      return
    }
  }
  let otp = await ctx.post('/api/auth/otp/request', { data: { phone: ADMIN_PHONE } })
  if (otp.status() === 429) {
    await new Promise((resolve) => setTimeout(resolve, 61_000))
    otp = await ctx.post('/api/auth/otp/request', { data: { phone: ADMIN_PHONE } })
  }
  if (!otp.ok()) throw new Error(`Admin OTP request failed: ${await otp.text()}`)
  const { devCode } = await otp.json()
  if (!devCode) throw new Error('OTP_EXPOSE_CODE must be true for e2e tests')
  const res = await ctx.post('/api/auth/otp/verify', { data: { phone: ADMIN_PHONE, code: devCode } })
  const { token, user } = await res.json()
  if (user.role !== 'ADMIN') throw new Error(`${ADMIN_PHONE} is not an admin`)
  mkdirSync('.auth', { recursive: true })
  writeFileSync(ADMIN_TOKEN_FILE, token)
  await ctx.dispose()
}
