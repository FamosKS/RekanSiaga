// Local SQL generator only. No network, credential access, or automatic execution.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
export const states = {
 USER: [null, []], NO_ROLE: [true, []], IM: [true, ['information_manager']],
 RV: [true, ['report_verifier']], ME: [true, ['mitigation_editor']],
 MULTI: [true, ['information_manager', 'mitigation_editor']],
 INACTIVE: [false, ['report_verifier']], INACTIVE_SA: [false, ['super_admin']],
 CROSS_RV: [true, ['report_verifier']],
}
export const reportCases = ['null-status','invalid-status','padded-status','blank-empty','blank','long','overunicode','unicode','reason4000','trimmed4000','trimmedunicode','trimmedover','valid','reject','review','review-reject','terminal','race','atomic']
export function reportId(run, label) {
 const h = createHash('sha256').update(`${run}/${label}`).digest('hex').slice(0,32).split('')
 h[12]='4'; h[16]='8'
 const s=h.join(''); return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`
}
export function validateManifest(m) {
 if(m.project_reference!=='fweeyflixnqbvvceuent' || m.project_name!=='rekansiaga-staging' ||
 m.run_id!=='phase4a5a-a-20261023-f768e9e3fb2f4223ac497e84871a1c1f') throw Error('Manifest target/run mismatch')
 const ids = Object.fromEntries(m.actors.map(a=>[a.label,a.user_id]))
 if(m.actors.length!==2 || ids.CONTROL!=='52280fb9-2fc0-4b39-b31b-8c806074c8c4' ||
 ids.SUBJECT!=='02c3da94-39c9-4c4d-bd37-d6040607ff81') throw Error('Approved actor mapping mismatch')
 return ids
}
export function fixtureSnapshot(m,state) {
 const ids=validateManifest(m),marker=`SYNTHETIC ${m.run_id}`
 if(state==='EMPTY') return []
 if(!Object.hasOwn(states,state)) throw Error('Unknown snapshot state')
 const [active,assigned]=states[state]
 return [
  {user_id:ids.CONTROL,display_name:`${marker} CONTROL`,is_active:true,
   role_codes:state==='CROSS_RV'?['report_verifier']:['super_admin']},
  ...(active===null?[]:[{user_id:ids.SUBJECT,display_name:`${marker} SUBJECT`,is_active:active,role_codes:[...assigned].sort()}]),
 ].sort((a,b)=>a.user_id.localeCompare(b.user_id,'en'))
}
export function fixtureSql(m,state,reports=false) {
 const ids=validateManifest(m)
 if(!Object.hasOwn(states,state)) throw Error('Unknown state')
 if(reports && state!=='CROSS_RV') throw Error('B fixtures require both active verifiers CROSS_RV')
 const [active,roles]=states[state],marker=`SYNTHETIC ${m.run_id}`
 const ordered=Object.keys(states),prev=ordered.indexOf(state)===0?'EMPTY':ordered[ordered.indexOf(state)-1]
 const expected=Object.fromEntries(['EMPTY',...ordered].map(x=>[x,fixtureSnapshot(m,x)]))
 let s=`-- REVIEW ONLY. Committed synthetic fixture transitions need separate approval.
-- Verified staging Dashboard ref fweeyflixnqbvvceuent; settings are attestation only.
-- Full batch; no concurrent tests. Existing unknown profile/assignment -> STOP.
-- Repeating identical target state is a no-op; assigned_at is preserved.
BEGIN;
SET LOCAL search_path=pg_catalog,public;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
-- SET LOCAL rekansiaga.fixture_release='approve-persistent-fixtures-fweeyflixnqbvvceuent';
SET LOCAL rekansiaga.fixture_from_state='${reports?'CROSS_RV':prev}'; -- explicit reviewed source state
DO $guard$
DECLARE actual jsonb; snapshots jsonb:=$snapshots$${JSON.stringify(expected)}$snapshots$::jsonb;
 source_state text:=current_setting('rekansiaga.fixture_from_state',true);
BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' OR
 current_setting('rekansiaga.fixture_release',true) IS DISTINCT FROM 'approve-persistent-fixtures-fweeyflixnqbvvceuent' THEN RAISE EXCEPTION 'Fixture approval missing'; END IF;
 PERFORM pg_advisory_xact_lock(414,451);
 LOCK TABLE public.staff_profiles,public.staff_role_assignments IN SHARE ROW EXCLUSIVE MODE;
 LOCK TABLE public.roles IN SHARE MODE;
 IF (SELECT count(*) FROM auth.users WHERE id IN ('${ids.CONTROL}','${ids.SUBJECT}'))<>2 OR
 (SELECT count(*) FROM pg_policies WHERE schemaname='public')<>27 OR
 NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.roles'::regclass AND polname='roles_assigned_active_staff_read') THEN RAISE EXCEPTION 'Auth/A prerequisite missing'; END IF;
 IF NOT (snapshots ? source_state) THEN RAISE EXCEPTION 'Unknown source fixture state'; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id',p.user_id,'display_name',p.display_name,'is_active',p.is_active,
 'role_codes',(SELECT COALESCE(jsonb_agg(r.code ORDER BY r.code COLLATE pg_catalog."C"),'[]'::jsonb)
 FROM public.staff_role_assignments a JOIN public.roles r ON r.id=a.role_id WHERE a.staff_id=p.user_id))
 ORDER BY p.user_id::text COLLATE pg_catalog."C"),'[]'::jsonb) INTO actual FROM public.staff_profiles p;
 IF actual IS DISTINCT FROM snapshots->source_state AND actual IS DISTINCT FROM snapshots->'${state}' THEN
 RAISE EXCEPTION 'Profile/assignment state drift; no unknown data overwrite allowed'; END IF;
 PERFORM set_config('rekansiaga.fixture_noop',(actual=snapshots->'${state}')::text,true);
END;
$guard$;
DO $transition$
BEGIN
 IF current_setting('rekansiaga.fixture_noop')::boolean THEN RETURN; END IF;
 -- Only a complete, exact, operator-approved source snapshot can reach this DML.
 DELETE FROM public.staff_role_assignments WHERE staff_id IN ('${ids.CONTROL}','${ids.SUBJECT}');
 INSERT INTO public.staff_profiles(user_id,display_name,is_active) SELECT '${ids.CONTROL}','${marker} CONTROL',true
 WHERE NOT EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id='${ids.CONTROL}');
 UPDATE public.staff_profiles SET is_active=true WHERE user_id='${ids.CONTROL}';
 INSERT INTO public.staff_role_assignments(staff_id,role_id) SELECT '${ids.CONTROL}',id FROM public.roles WHERE code='${state==='CROSS_RV'?'report_verifier':'super_admin'}';
`
 if(active===null) s+=` IF EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id='${ids.SUBJECT}') THEN RAISE EXCEPTION 'USER requires no existing SUBJECT profile; no automatic profile deletion'; END IF;\n`
 else {
 s+=` INSERT INTO public.staff_profiles(user_id,display_name,is_active) SELECT '${ids.SUBJECT}','${marker} SUBJECT',${active} WHERE NOT EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id='${ids.SUBJECT}');\n UPDATE public.staff_profiles SET is_active=${active} WHERE user_id='${ids.SUBJECT}';\n`
 if(roles.length) s+=` INSERT INTO public.staff_role_assignments(staff_id,role_id) SELECT '${ids.SUBJECT}',id FROM public.roles WHERE code IN (${roles.map(x=>`'${x}'`).join(',')});\n`
 }
 s+='END;\n$transition$;\n'
 if(reports) for(const label of reportCases) {
 const id=reportId(m.run_id,label),tracking=`SYNTH-${m.run_id}-${label}`,status=label==='terminal'?'verified':'unverified'
 s+=`DO $report_fixture$ BEGIN
 IF EXISTS(SELECT 1 FROM public.public_reports WHERE (id='${id}' AND tracking_code<>'${tracking}') OR (tracking_code='${tracking}' AND id<>'${id}')) THEN RAISE EXCEPTION 'Report collision: ${label}'; END IF;
 IF EXISTS(SELECT 1 FROM public.public_reports WHERE id='${id}') THEN
 IF NOT EXISTS(SELECT 1 FROM public.public_reports WHERE id='${id}' AND tracking_code='${tracking}' AND report_type='other'
 AND title='SYNTHETIC ${label}' AND description='Synthetic isolated security test report, no real person or location.' AND status='${status}'
 AND event_id IS NULL AND region_id IS NULL AND coordinates IS NULL AND location_description IS NULL AND reviewed_by IS NULL AND reviewed_at IS NULL AND created_at=updated_at) OR
 EXISTS(SELECT 1 FROM public.report_status_history WHERE report_id='${id}') OR
 EXISTS(SELECT 1 FROM public.report_attachments WHERE report_id='${id}') OR
 EXISTS(SELECT 1 FROM public.report_access_tokens WHERE report_id='${id}') THEN RAISE EXCEPTION 'Report reused/modified: ${label}; no reset permitted'; END IF;
 ELSE
 INSERT INTO public.public_reports(id,tracking_code,report_type,title,description,status)
 VALUES('${id}','${tracking}','other','SYNTHETIC ${label}','Synthetic isolated security test report, no real person or location.','${status}');
 END IF;
 END; $report_fixture$;\n`
 }
 return s+`SELECT '${state}' AS fixture_state,current_setting('rekansiaga.fixture_noop')::boolean AS profiles_already_matched,
 (SELECT count(*) FROM public.staff_profiles) AS profiles,(SELECT count(*) FROM public.staff_role_assignments) AS assignments;
COMMIT;
`
}
export function recoverySql(m,state,restoreUser=false) {
 const ids=validateManifest(m),source=fixtureSnapshot(m,state)
 if(state==='EMPTY') throw Error('Recovery requires a provisioned fixture state')
 const recovered=restoreUser?fixtureSnapshot(m,'USER'):source.map(p=>({...p,is_active:false,role_codes:[]}))
 const operation=restoreUser?`
 IF actual=recovered THEN RETURN; END IF;
 -- Refuse every inbound SUBJECT dependency except its known synthetic role rows.
 -- This prevents ON DELETE SET NULL/CASCADE from altering history or other data.
 FOR dep IN SELECT c.conrelid,c.conkey,c.confkey,n.nspname FROM pg_constraint c
 JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
 WHERE c.contype='f' AND c.confrelid='public.staff_profiles'::regclass
 AND c.conrelid<>'public.staff_role_assignments'::regclass LOOP
 IF dep.nspname<>'public' OR cardinality(dep.conkey)<>1 OR
 dep.confkey IS DISTINCT FROM ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='public.staff_profiles'::regclass AND attname='user_id')]::smallint[]
 THEN RAISE EXCEPTION 'Unexpected profile FK; no automatic restore'; END IF;
 SELECT attname INTO fk_column FROM pg_attribute WHERE attrelid=dep.conrelid AND attnum=dep.conkey[1];
 EXECUTE format('LOCK TABLE %s IN SHARE MODE',dep.conrelid::regclass);
 EXECUTE format('SELECT EXISTS(SELECT 1 FROM %s WHERE %I=$1)',dep.conrelid::regclass,fk_column) INTO referenced USING '${ids.SUBJECT}'::uuid;
 IF referenced THEN RAISE EXCEPTION 'SUBJECT profile referenced; preserve audit/business data, restore refused'; END IF;
 END LOOP;
 DELETE FROM public.staff_role_assignments WHERE staff_id IN ('${ids.CONTROL}','${ids.SUBJECT}');
 DELETE FROM public.staff_profiles WHERE user_id='${ids.SUBJECT}';
 UPDATE public.staff_profiles SET is_active=true WHERE user_id='${ids.CONTROL}';
 INSERT INTO public.staff_role_assignments(staff_id,role_id) SELECT '${ids.CONTROL}',id FROM public.roles WHERE code='super_admin';
 IF NOT EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id='${ids.CONTROL}' AND is_active) OR
 EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id='${ids.SUBJECT}') OR
 (SELECT count(*) FROM public.staff_role_assignments WHERE staff_id='${ids.CONTROL}')<>1
 THEN RAISE EXCEPTION 'USER restore failed'; END IF;
 `:`
 DELETE FROM public.staff_role_assignments WHERE staff_id IN ('${ids.CONTROL}','${ids.SUBJECT}');
 UPDATE public.staff_profiles SET is_active=false
 WHERE user_id IN ('${ids.CONTROL}','${ids.SUBJECT}') AND is_active IS DISTINCT FROM false;
 IF EXISTS(SELECT 1 FROM public.staff_role_assignments WHERE staff_id IN ('${ids.CONTROL}','${ids.SUBJECT}')) OR
 EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id IN ('${ids.CONTROL}','${ids.SUBJECT}') AND is_active)
 THEN RAISE EXCEPTION 'Recovery access removal failed'; END IF;
 `
 return `-- REVIEW ONLY: ${restoreUser?'restore USER before SUBJECT gains any references':'terminal quarantine, NOT a reset'} for this synthetic run.
-- Verify staging Dashboard fweeyflixnqbvvceuent. Preserve evidence before running.
-- No Auth/report/history deletion. ${restoreUser?'Delete only unreferenced synthetic SUBJECT profile; preserve CONTROL.':'No profile deletion; staff access removed.'}
BEGIN;
SET LOCAL search_path=pg_catalog,public;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
-- SET LOCAL rekansiaga.fixture_release='approve-persistent-fixtures-fweeyflixnqbvvceuent';
-- SET LOCAL rekansiaga.verified_ref='fweeyflixnqbvvceuent';
DO $recover$
DECLARE actual jsonb; dep record; fk_column name; referenced boolean;
 expected jsonb:=$source$${JSON.stringify(source)}$source$::jsonb;
 recovered jsonb:=$recovered$${JSON.stringify(recovered)}$recovered$::jsonb;
BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' OR
 current_setting('rekansiaga.verified_ref',true) IS DISTINCT FROM 'fweeyflixnqbvvceuent' OR
 current_setting('rekansiaga.fixture_release',true) IS DISTINCT FROM 'approve-persistent-fixtures-fweeyflixnqbvvceuent'
 THEN RAISE EXCEPTION 'Verified staging/fixture approval required'; END IF;
 PERFORM pg_advisory_xact_lock(414,451);
 LOCK TABLE public.staff_profiles,public.staff_role_assignments IN SHARE ROW EXCLUSIVE MODE;
 LOCK TABLE public.roles IN SHARE MODE;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id',p.user_id,'display_name',p.display_name,'is_active',p.is_active,
 'role_codes',(SELECT COALESCE(jsonb_agg(r.code ORDER BY r.code COLLATE pg_catalog."C"),'[]'::jsonb)
 FROM public.staff_role_assignments a JOIN public.roles r ON r.id=a.role_id WHERE a.staff_id=p.user_id))
 ORDER BY p.user_id::text COLLATE pg_catalog."C"),'[]'::jsonb) INTO actual FROM public.staff_profiles p;
 IF actual IS DISTINCT FROM expected AND actual IS DISTINCT FROM recovered
 THEN RAISE EXCEPTION 'Recovery fixture drift; preserve state and inspect, no unknown overwrite'; END IF;
 ${operation}
END;
$recover$;
SELECT '${restoreUser?'SYNTHETIC_USER_RESTORED_NO_REFERENCES_DELETED':'SYNTHETIC_ACCESS_QUARANTINED_EVIDENCE_RETAINED'}' AS checkpoint;
COMMIT;
`
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 try {
 const [manifest,state,flag]=process.argv.slice(2)
 if(!manifest || !state || (flag && !['--reports','--recovery','--restore-user'].includes(flag)) || process.argv.length>5) throw Error('Usage: node scripts/prepare-phase4a-fixture.mjs PRIVATE_MANIFEST STATE [--reports|--recovery|--restore-user]')
 const privateDir=path.resolve('docs/qa/phase4a/remediation-a/private')
 const input=path.resolve(manifest)
 if(path.dirname(input)!==privateDir) throw Error('Manifest must be in protected private folder')
 const m=JSON.parse(fs.readFileSync(input,'utf8').replace(/^\uFEFF/,''))
 const output=path.join(privateDir,`fixture-${m.run_id}-${state}${flag==='--reports'?'-reports':flag==='--recovery'?'-recovery':flag==='--restore-user'?'-restore-user':''}.review.sql`)
 fs.writeFileSync(output,flag==='--restore-user'?recoverySql(m,state,true):flag==='--recovery'?recoverySql(m,state):fixtureSql(m,state,flag==='--reports'),{flag:'wx'})
 console.log('Prepared private SQL review copy; NOT executed. Existing output is never overwritten.')
 } catch { console.error('Fixture preparation stopped. Check arguments/manifest/collision. No remote operation.'); process.exitCode=1 }
}
