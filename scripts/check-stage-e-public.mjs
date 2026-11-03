// Stage E public data reads only; does not invoke gateways/RPC, Auth, A-D checks or mutations.
import { mkdirSync, writeFileSync } from 'node:fs'
import { loadEnv } from 'vite'
const env=loadEnv('development',process.cwd(),'VITE_'),target='https://uiuiouosblyuqgnvfpeh.supabase.co'
if(env.VITE_SUPABASE_URL!==target)throw Error('Exact dev project required')
const specs=[['articles','publication_status=eq.published&published_at=not.is.null'],['disaster_events','published_at=not.is.null&verification_status=in.(source_confirmed,staff_verified)'],['emergency_contacts','is_verified=eq.true&is_active=eq.true'],['mitigation_guides','publication_status=eq.published'],['relief_locations','verification_status=eq.verified'],['data_sources','is_active=eq.true']]
const checks=await Promise.all(specs.map(async([table,filter])=>{
 try{const response=await fetch(`${target}/rest/v1/${table}?select=id&limit=1&${filter}`,{method:'GET',headers:{apikey:env.VITE_SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});const data=await response.json();return{table,status:response.status,read:response.ok&&Array.isArray(data)?'PASS':'FAIL',visibleSampleRows:Array.isArray(data)?data.length:0}}
 catch{return{table,read:'BLOCKED',reason:'Network unavailable; values suppressed'}}
}))
const report={kind:'LIVE anonymous GET only, ID sample max 1 per table; not CRUD/status/audit acceptance',projectRef:'uiuiouosblyuqgnvfpeh',checkedAt:new Date().toISOString(),checks,cloudWrites:0}
mkdirSync('docs/qa/stage-e',{recursive:true});writeFileSync('docs/qa/stage-e/public-readonly.json',JSON.stringify(report,null,2));for(const check of checks)console.log(`${check.table}: ${check.read}${check.status?' HTTP '+check.status:''}`)
