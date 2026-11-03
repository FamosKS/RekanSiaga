import assert from 'node:assert/strict'
import test from 'node:test'
import { readGatewayConfig, verifiedChallenge } from '../supabase/functions/_shared/gatewayConfig.ts'
const base = { SUPABASE_URL: 'https://uiuiouosblyuqgnvfpeh.supabase.co', REPORT_PUBLIC_KEY: 'sb_publishable_localfixture', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_localfixture', TURNSTILE_SECRET_KEY: 'local-fixture-only', REPORT_RATE_HMAC_KEY: 'a'.repeat(64), REPORT_ALLOWED_ORIGINS: 'https://app.example.test,http://localhost:5173', TURNSTILE_HOSTNAMES: 'app.example.test,localhost', REPORT_TRUSTED_IP_HEADER: 'x-forwarded-for', REPORT_GATEWAY_ENABLED: 'true' }
function config(patch={}) { const data={...base,...patch}; return readGatewayConfig(name=>data[name]??'') }
await test('Syntactically valid config enables only with explicit gateway flag',()=>{assert.equal(config().enabled,true);assert.equal(config({REPORT_GATEWAY_ENABLED:'false'}).enabled,false)})
await test('CORS excludes wildcard, null origin, insecure remote HTTP and non-origin URLs',()=>{for(const origin of ['*','null',',,,','http://public.example.test','https://user:pass@app.example.test','https://app.example.test/path','https://app.example.test?token=x'])assert.equal(config({REPORT_ALLOWED_ORIGINS:origin}).enabled,false,origin)})
await test('Empty/malformed CAPTCHA hostname lists, required placeholders and wrong dev/key types fail closed',()=>{for(const hosts of [',,,','https://app.example.test','app.example.test:443','*.example.test'])assert.equal(config({TURNSTILE_HOSTNAMES:hosts}).enabled,false);for(const patch of [{TURNSTILE_SECRET_KEY:'replace_on_server_only'},{REPORT_PUBLIC_KEY:'sb_secret_wrongtype'},{SUPABASE_SERVICE_ROLE_KEY:'sb_publishable_wrongtype'},{SUPABASE_URL:'https://fweeyflixnqbvvceuent.supabase.co'}])assert.equal(config(patch).enabled,false)})
await test('Dev-global mode requires no IP/header/HMAC setting and never reads them',()=>{
  const requested=[]; const {REPORT_TRUSTED_IP_HEADER: _header, REPORT_RATE_HMAC_KEY: _hmac, ...required}=base
  const result=readGatewayConfig(name=>{requested.push(name);return required[name]??''})
  assert.equal(result.enabled,true); assert.equal(result.quotaMode,'dev-global')
  assert.ok(!requested.includes('REPORT_TRUSTED_IP_HEADER')); assert.ok(!requested.includes('REPORT_RATE_HMAC_KEY'))
  assert.equal(config({REPORT_TRUSTED_IP_HEADER:'caller-ip',REPORT_RATE_HMAC_KEY:'invalid-ignored'}).enabled,true)
})
await test('CAPTCHA success requires actual hostname/action, never missing or mismatched fields',()=>{const hosts=config().hostnames;for(const value of [{success:true,action:'submit'},{success:true,action:'submit',hostname:''},{success:true,action:'track',hostname:'app.example.test'},{success:true,action:'submit',hostname:'attacker.test'},{success:false,action:'submit',hostname:'app.example.test'}])assert.equal(verifiedChallenge(value,'submit',hosts),false);assert.equal(verifiedChallenge({success:true,action:'submit',hostname:'APP.EXAMPLE.TEST'},'submit',hosts),true)})
