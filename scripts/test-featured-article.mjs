// PostgreSQL/WASM only: executes the proposed SQL with synthetic rows; never connects to Supabase.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { PGlite } from '../.tools/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js'

const db = await PGlite.create()
const checks = []
const q = async (sql, params = []) => (await db.query(sql, params)).rows
const check = async (name, fn) => { await fn(); checks.push({ name, status: 'PASS' }); console.log(`PASS ${name}`) }
const a='00000000-0000-4000-8000-000000000101', b='00000000-0000-4000-8000-000000000102', d='00000000-0000-4000-8000-000000000103', uid='00000000-0000-4000-8000-000000000199'
const asRole = async (role='information_manager') => { await db.exec(`SET test.role='${role}'; SET test.uid='${uid}'; SET ROLE authenticated`) }
const reset = () => db.exec('RESET ROLE')
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
    CREATE FUNCTION public.has_staff_role(text[]) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT auth.uid() IS NOT NULL AND coalesce(current_setting('test.role',true)=ANY($1),false)$$;
    CREATE TABLE public.audit_logs(id uuid DEFAULT gen_random_uuid(),actor_id uuid,action text,entity_type text,entity_id uuid,old_values jsonb,new_values jsonb);
    CREATE TABLE public.articles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),author_id uuid,title text NOT NULL,slug text NOT NULL UNIQUE,summary text,content text NOT NULL,cover_image_path text,source_url text,publication_status text NOT NULL DEFAULT 'draft',published_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
    CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.updated_at=clock_timestamp(); RETURN NEW; END$$;
    CREATE TRIGGER trg_articles_updated BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY articles_public_read ON public.articles FOR SELECT TO anon,authenticated USING(publication_status='published' AND published_at IS NOT NULL);
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
    GRANT SELECT ON public.articles TO anon,authenticated;
    INSERT INTO public.articles(id,title,slug,summary,content,publication_status,published_at,updated_at) VALUES
      ('${a}','TEST lama','test-lama','ringkasan','isi cukup','published',now()-interval '2 days',now()-interval '2 days'),
      ('${b}','TEST terbaru','test-terbaru','ringkasan baru','isi cukup','published',now()-interval '1 day',now()-interval '1 day'),
      ('${d}','TEST draft','test-draft','draft','isi cukup','draft',NULL,now());
    SET test.uid='${uid}';`)

  const migration = readFileSync('supabase/releases/dev-featured-article.PROPOSED.sql','utf8')
  await check('unapproved SQL stops before schema mutation', async () => {
    await assert.rejects(db.exec(migration), /featured article package approval required/)
    await db.exec('ROLLBACK')
    assert.equal((await q("SELECT to_regclass('public.articles_one_featured_idx') x"))[0].x, null)
  })
  await db.exec("SET rekansiaga.release_ref='uiuiouosblyuqgnvfpeh'")
  await check('read-only preflight validates existing published-only RLS and absent feature objects', async () => {
    const result=await db.exec(readFileSync('supabase/releases/dev-featured-article-preflight.sql','utf8'))
    const baseline=result.find(r=>r.rows.length)?.rows[0].featured_article_preflight
    assert.equal(baseline.project_ref,'uiuiouosblyuqgnvfpeh'); assert.equal(baseline.current_user,'postgres'); assert.equal(baseline.session_user,'postgres')
    assert.equal(baseline.articles_rls_enabled,true); assert.equal(baseline.published_only_policy_exists,true); assert.equal(baseline.feature_column_exists,false); assert.equal(baseline.feature_rpcs_absent,true)
  })
  await db.exec("SET rekansiaga.release_approval='approve-dev-featured-article-v1'")
  await check('approved proposal adds constrained single-feature schema, RPCs, and audit triggers', async () => {
    await db.exec(migration)
    assert.ok((await q("SELECT to_regclass('public.articles_one_featured_idx') x"))[0].x)
  })
  const latest = async () => (await q('SELECT * FROM public.public_home_featured_article_v1()'))[0] ?? null
  await check('public read returns latest published fallback and excludes drafts', async () => {
    await db.exec('SET ROLE anon')
    const fallback = await latest()
    assert.equal(fallback.id,b); assert.equal(fallback.is_featured,false)
    assert.equal((await q('SELECT id FROM public.articles')).length,2)
    await reset()
  })
  await check('RBAC denies non-content staff and public callers from feature mutation', async () => {
    await asRole('report_verifier')
    await assert.rejects(db.query('SELECT public.admin_set_featured_article_v1($1,$2)',[a,(await q('SELECT updated_at FROM public.articles WHERE id=$1',[a]))[0].updated_at]), e=>e.code==='42501')
    await reset(); await db.exec('SET ROLE anon')
    await assert.rejects(db.query('SELECT public.admin_set_featured_article_v1($1,$2)',[a,new Date().toISOString()]), e=>e.code==='42501')
    await reset()
  })
  await check('published article can be selected and audited; draft selection is rejected', async () => {
    await asRole(); const stamp=(await q('SELECT updated_at FROM public.articles WHERE id=$1',[a]))[0].updated_at
    assert.equal((await q('SELECT public.admin_set_featured_article_v1($1,$2) x',[a,stamp]))[0].x.is_featured,true)
    await reset(); assert.equal((await latest()).id,a); assert.equal((await latest()).is_featured,true)
    const draftStamp=(await q('SELECT updated_at FROM public.articles WHERE id=$1',[d]))[0].updated_at; await asRole()
    await assert.rejects(db.query('SELECT public.admin_set_featured_article_v1($1,$2)',[d,draftStamp]),e=>e.code==='22023')
    await reset(); assert.equal((await q("SELECT count(*)::int n FROM public.audit_logs WHERE action='SET_FEATURED'"))[0].n,1)
  })
  await check('replacement is atomic, leaves exactly one featured article, and logs both transitions', async () => {
    await asRole(); const stamp=(await q('SELECT updated_at FROM public.articles WHERE id=$1',[b]))[0].updated_at
    await q('SELECT public.admin_set_featured_article_v1($1,$2)',[b,stamp]); await reset()
    assert.equal((await q('SELECT count(*)::int n FROM public.articles WHERE is_featured'))[0].n,1)
    assert.equal((await latest()).id,b)
    assert.equal((await q("SELECT count(*)::int n FROM public.audit_logs WHERE action='SET_FEATURED'"))[0].n,3)
    await assert.rejects(db.query('UPDATE public.articles SET is_featured=true WHERE id=$1',[a]),e=>e.code==='23505')
  })
  await check('archive automatically clears featured and public query falls back to newest published', async () => {
    await q("UPDATE public.articles SET publication_status='archived' WHERE id=$1",[b])
    assert.equal((await q('SELECT count(*)::int n FROM public.articles WHERE is_featured'))[0].n,0)
    const fallback=await latest(); assert.equal(fallback.id,a); assert.equal(fallback.is_featured,false)
  })
  await check('explicit clear is version-guarded, and published_at removal clears atomically', async () => {
    await asRole(); let stamp=(await q('SELECT updated_at FROM public.articles WHERE id=$1',[a]))[0].updated_at
    await q('SELECT public.admin_set_featured_article_v1($1,$2)',[a,stamp]); await reset()
    stamp=(await q('SELECT updated_at FROM public.articles WHERE id=$1',[a]))[0].updated_at
    await asRole(); await q('SELECT public.admin_set_featured_article_v1(NULL,$1)',[stamp]); await reset()
    assert.equal((await q('SELECT count(*)::int n FROM public.articles WHERE is_featured'))[0].n,0)
    await asRole(); stamp=(await q('SELECT updated_at FROM public.articles WHERE id=$1',[a]))[0].updated_at
    await q('SELECT public.admin_set_featured_article_v1($1,$2)',[a,stamp]); await reset()
    await q('UPDATE public.articles SET published_at=NULL WHERE id=$1',[a])
    assert.equal((await q('SELECT count(*)::int n FROM public.articles WHERE is_featured'))[0].n,0)
  })
  await check('empty published catalog gives empty public result and Admin sync invalidates shared public cache', async () => {
    await q("UPDATE public.articles SET publication_status='archived',is_featured=false WHERE publication_status='published'")
    assert.equal(await latest(),null)
    const admin=readFileSync('src/features/content/ArticleWorkspace.tsx','utf8')
    const hook=readFileSync('src/features/content/usePublicContent.ts','utf8')
    assert.ok(admin.includes("client.invalidateQueries({ queryKey: ['public-content'] })"))
    assert.ok(hook.includes("queryKey: ['public-content', 'featured-article']"))
  })
  await check('focused SQL postflight confirms migration and RPC privilege boundaries', async () => {
    const result=await db.exec(readFileSync('supabase/releases/dev-featured-article-postflight.sql','utf8'))
    assert.equal(result.find(r=>r.rows.length)?.rows[0].featured_article_postflight.status,'PASS')
  })
} finally {
  await db.close()
  writeFileSync('docs/qa/stage-e/featured-article-local.json',JSON.stringify({kind:'LOCAL PostgreSQL/WASM; synthetic articles/auth role fixture; no Cloud connection',cloudCalls:0,checks},null,2))
}
