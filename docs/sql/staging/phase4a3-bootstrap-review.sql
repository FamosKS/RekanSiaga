-- PHASE 4A.3 STAGING BOOTSTRAP - REVIEW/Dry-run ONLY. NOT EXECUTED.
-- Derived from supabase/migrations/001_rekansiaga_initial_schema.sql.
-- Master SHA256: 6e7db11bee992ad34ff534f71198d6fe4ab59c373b8986859e1144d1404b77fb
-- New empty rekansiaga-staging project only. No dev rows or real accounts copied.
-- This is baseline preparation, NOT remediation A/B/C1/C2.
-- Explicit object ACL cleanup enforces the Master's intended callers despite
-- inherited default grants; limited-role policy / old review validation remain
-- known baseline findings for later separately approved remediation.
-- ROLLBACK is deliberate. Running this file DOES NOT persist the staging schema.
-- See docs/phase4a3-staging-preparation.md for approval and validation workflow.
-- REKANSIAGA v1.0 — initial schema (Supabase PostgreSQL 15+)
-- Execute on a NEW Supabase project in SQL Editor. Review before deployment.
-- One shared database for web and mobile; no direct anonymous access to report tables.
-- This creates 26 public application tables, plus uses managed auth.users.
BEGIN;

-- Human must verify Dashboard project name AND project reference before enabling
-- this acknowledgement INSIDE this transaction. It is not server identity proof.
-- SET LOCAL rekansiaga.staging_target = 'rekansiaga-staging-confirmed-by-operator';
-- If the one pre-existing rls_auto_enable() candidate is present, FIRST run
-- phase4a3-inspect-rls-auto-enable.sql and review its body + complete event graph.
-- These settings are deliberately NOT supplied with executable/default values.
-- Copy hashes only AFTER behavior/config review, not merely from query output.
-- SET LOCAL rekansiaga.rls_auto_enable_behavior_review = 'approved-for-staging-ddl';
-- SET LOCAL rekansiaga.reviewed_rls_auto_enable_definition_md5 = '<reviewed-definition-md5>';
-- SET LOCAL rekansiaga.reviewed_rls_event_graph_md5 = '<reviewed-event-graph-md5>';
DO $staging_guard$
DECLARE
 v_public_routines bigint;
 v_function oid;
 v_event oid;
 v_definition_md5 text;
 v_event_graph_md5 text;
BEGIN
 IF current_setting('rekansiaga.staging_target', true) IS DISTINCT FROM
    'rekansiaga-staging-confirmed-by-operator' THEN
  RAISE EXCEPTION 'Staging target acknowledgement missing; stop and review';
 END IF;
 IF current_user <> 'postgres' OR current_setting('server_version_num')::integer < 150000 THEN
  RAISE EXCEPTION 'Expected reviewed postgres owner on PostgreSQL 15+';
 END IF;
 IF current_setting('session_replication_role') <> 'origin' THEN
  RAISE EXCEPTION 'Expected origin replication role; do not bypass event triggers';
 END IF;
 IF to_regclass('auth.users') IS NULL OR
    (SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')) <> 3 THEN
  RAISE EXCEPTION 'Supabase managed prerequisites missing';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')) THEN
  RAISE EXCEPTION 'Public relations must be empty; no cleanup or overwrite allowed';
 END IF;
 SELECT count(*) INTO v_public_routines
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public';
 IF v_public_routines > 0 THEN
  IF v_public_routines <> 1 THEN
   RAISE EXCEPTION 'Unexpected public routines or overloads; stop and inspect';
  END IF;
  SELECT p.oid INTO v_function
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='rls_auto_enable'
   AND p.prokind='f' AND p.pronargs=0 AND p.provariadic=0
   AND p.proallargtypes IS NULL AND p.proargmodes IS NULL
   AND NOT p.proretset AND p.prorettype='pg_catalog.event_trigger'::regtype
   AND p.prosecdef AND pg_get_userbyid(p.proowner)='postgres';
  IF v_function IS NULL THEN
   RAISE EXCEPTION 'Only a reviewed postgres definer rls_auto_enable() returning event_trigger is a candidate';
  END IF;
  SELECT e.oid INTO v_event FROM pg_event_trigger e
  WHERE e.evtname='ensure_rls' AND e.evtfoid=v_function
   AND e.evtevent='ddl_command_end' AND e.evtenabled='O'
   AND pg_get_userbyid(e.evtowner)='postgres';
  IF v_event IS NULL OR
     (SELECT count(*) FROM pg_event_trigger e WHERE e.evtfoid=v_function) <> 1 THEN
   RAISE EXCEPTION 'ensure_rls linkage/owner/event/status or extra caller does not match';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_depend d
      WHERE d.classid='pg_catalog.pg_event_trigger'::regclass AND d.objid=v_event
       AND d.refclassid='pg_catalog.pg_proc'::regclass AND d.refobjid=v_function
       AND d.deptype='n') THEN
   RAISE EXCEPTION 'Expected event-trigger function dependency missing';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d
      WHERE ((d.classid='pg_catalog.pg_proc'::regclass AND d.objid=v_function)
          OR (d.classid='pg_catalog.pg_event_trigger'::regclass AND d.objid=v_event))
       AND d.refclassid='pg_catalog.pg_extension'::regclass AND d.deptype IN ('e','x')) THEN
   RAISE EXCEPTION 'Extension membership differs from reported standalone candidate';
  END IF;
  SELECT md5(pg_get_functiondef(v_function)) INTO v_definition_md5;
  -- Keep this graph shape identical to the read-only inspector. It pins all
  -- event triggers (not only ensure_rls), their owners/tags/ACL/config/body and
  -- outgoing dependencies, so an unrelated DDL hook cannot be ignored by name.
  SELECT md5(COALESCE(jsonb_agg(jsonb_build_object(
   'event_oid',e.oid,'name',e.evtname,'owner',pg_get_userbyid(e.evtowner),
   'event',e.evtevent,'enabled',e.evtenabled,'tags',e.evttags,
   'function_oid',p.oid,'schema',n.nspname,'function',p.proname,
   'signature',pg_get_function_identity_arguments(p.oid),
   'return_type',pg_get_function_result(p.oid),
   'function_owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,
   'config',p.proconfig,'acl',p.proacl::text,
   'definition_md5',md5(pg_get_functiondef(p.oid)),
   'dependencies',(SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'class',d.classid::regclass::text,'type',d.deptype,
      'reference',pg_describe_object(d.refclassid,d.refobjid,d.refobjsubid))
      ORDER BY d.classid,d.objid,d.refclassid,d.refobjid,d.refobjsubid,d.deptype),'[]'::jsonb)
     FROM pg_depend d WHERE
      (d.classid='pg_catalog.pg_proc'::regclass AND d.objid=p.oid) OR
      (d.classid='pg_catalog.pg_event_trigger'::regclass AND d.objid=e.oid))
  ) ORDER BY e.evtname),'[]'::jsonb)::text) INTO v_event_graph_md5
  FROM pg_event_trigger e JOIN pg_proc p ON p.oid=e.evtfoid
  JOIN pg_namespace n ON n.oid=p.pronamespace;
  IF current_setting('rekansiaga.rls_auto_enable_behavior_review',true)
       IS DISTINCT FROM 'approved-for-staging-ddl' OR
     current_setting('rekansiaga.reviewed_rls_auto_enable_definition_md5',true)
       IS DISTINCT FROM v_definition_md5 OR
     current_setting('rekansiaga.reviewed_rls_event_graph_md5',true)
       IS DISTINCT FROM v_event_graph_md5 THEN
   RAISE EXCEPTION 'Function behavior/event graph review missing or metadata drifted; bootstrap blocked';
  END IF;
 ELSIF EXISTS (SELECT 1 FROM pg_event_trigger WHERE evtname='ensure_rls') THEN
  RAISE EXCEPTION 'ensure_rls exists without the reviewed public candidate';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
            WHERE e.extname='postgis' AND n.nspname <> 'extensions') THEN
  RAISE EXCEPTION 'PostGIS already installed outside extensions; do not relocate automatically';
 END IF;
END;
$staging_guard$;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_catalog;

-- 1-3: geographic reference + data sources
CREATE TABLE public.regions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 parent_id uuid REFERENCES public.regions(id) ON DELETE RESTRICT,
 code text NOT NULL UNIQUE,
 name text NOT NULL,
 region_type text NOT NULL CHECK(region_type IN ('province','regency','city','district','village')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(parent_id IS NULL OR parent_id <> id)
);
CREATE TABLE public.data_sources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL UNIQUE,
 source_type text NOT NULL CHECK(source_type IN ('official_api','manual','other')),
 official_url text,
 api_identifier text,
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.source_sync_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_id uuid NOT NULL REFERENCES public.data_sources(id) ON DELETE RESTRICT,
 sync_status text NOT NULL CHECK(sync_status IN ('success','partial','failed')),
 records_processed integer NOT NULL DEFAULT 0 CHECK(records_processed>=0),
 error_message text,
 started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 CHECK(finished_at IS NULL OR finished_at>=started_at)
);

-- 4-6: staff roles (auth.users remains managed by Supabase)
CREATE TABLE public.staff_profiles (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL,
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text NOT NULL UNIQUE CHECK(code IN ('super_admin','information_manager','report_verifier','mitigation_editor')),
 name text NOT NULL,
 description text
);
CREATE TABLE public.staff_role_assignments (
 staff_id uuid NOT NULL REFERENCES public.staff_profiles(user_id) ON DELETE CASCADE,
 role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
 assigned_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(staff_id,role_id)
);

-- 7-9: disaster sources and geospatial events
CREATE TABLE public.disaster_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_id uuid NOT NULL REFERENCES public.data_sources(id) ON DELETE RESTRICT,
 external_id text,
 region_id uuid REFERENCES public.regions(id) ON DELETE RESTRICT,
 disaster_type text NOT NULL,
 title text NOT NULL,
 description text,
 severity text,
 verification_status text NOT NULL DEFAULT 'unconfirmed' CHECK(verification_status IN ('unconfirmed','source_confirmed','staff_verified')),
 event_status text NOT NULL DEFAULT 'unknown' CHECK(event_status IN ('unknown','ongoing','resolved')),
 occurred_at timestamptz,
 source_updated_at timestamptz,
 fetched_at timestamptz,
 published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_disaster_source_external ON public.disaster_events(source_id,external_id) WHERE external_id IS NOT NULL;
CREATE TABLE public.event_updates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES public.disaster_events(id) ON DELETE RESTRICT,
 update_type text NOT NULL,
 description text NOT NULL,
 source_updated_at timestamptz,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 recorded_by uuid REFERENCES public.staff_profiles(user_id) ON DELETE SET NULL
);
CREATE TABLE public.event_locations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES public.disaster_events(id) ON DELETE RESTRICT,
 region_id uuid REFERENCES public.regions(id) ON DELETE RESTRICT,
 label text NOT NULL,
 location_type text NOT NULL CHECK(location_type IN ('epicenter','affected_area','other')),
 coordinates extensions.geography(Point,4326),
 is_primary boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX uq_one_primary_event_location ON public.event_locations(event_id) WHERE is_primary;

-- 10-13: anonymous public reporting and controlled tracking
CREATE TABLE public.public_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tracking_code text NOT NULL UNIQUE,
 event_id uuid REFERENCES public.disaster_events(id) ON DELETE SET NULL,
 region_id uuid REFERENCES public.regions(id) ON DELETE RESTRICT,
 report_type text NOT NULL,
 title text NOT NULL,
 description text NOT NULL,
 coordinates extensions.geography(Point,4326),
 location_description text,
 status text NOT NULL DEFAULT 'unverified' CHECK(status IN ('unverified','under_review','verified','rejected')),
 reviewed_by uuid REFERENCES public.staff_profiles(user_id) ON DELETE SET NULL,
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(length(trim(title)) BETWEEN 5 AND 180),
 CHECK(length(trim(description)) BETWEEN 10 AND 5000)
);
CREATE TABLE public.report_attachments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 report_id uuid NOT NULL REFERENCES public.public_reports(id) ON DELETE RESTRICT,
 storage_path text NOT NULL UNIQUE,
 mime_type text NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),
 file_size bigint NOT NULL CHECK(file_size>0 AND file_size<=5242880),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.report_status_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 report_id uuid NOT NULL REFERENCES public.public_reports(id) ON DELETE RESTRICT,
 from_status text CHECK(from_status IS NULL OR from_status IN ('unverified','under_review','verified','rejected')),
 to_status text NOT NULL CHECK(to_status IN ('unverified','under_review','verified','rejected')),
 changed_by uuid REFERENCES public.staff_profiles(user_id) ON DELETE SET NULL,
 reason text,
 changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.report_access_tokens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 report_id uuid NOT NULL REFERENCES public.public_reports(id) ON DELETE RESTRICT,
 token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);

-- 14-16: article CMS and disaster preparedness guides
CREATE TABLE public.articles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 author_id uuid REFERENCES public.staff_profiles(user_id) ON DELETE SET NULL,
 title text NOT NULL,
 slug text NOT NULL UNIQUE,
 summary text,
 content text NOT NULL,
 cover_image_path text,
 source_url text,
 publication_status text NOT NULL DEFAULT 'draft' CHECK(publication_status IN ('draft','published','archived')),
 published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(publication_status<>'published' OR published_at IS NOT NULL)
);
CREATE TABLE public.mitigation_guides (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 author_id uuid REFERENCES public.staff_profiles(user_id) ON DELETE SET NULL,
 disaster_type text NOT NULL,
 title text NOT NULL,
 summary text,
 content text NOT NULL,
 source_url text,
 publication_status text NOT NULL DEFAULT 'draft' CHECK(publication_status IN ('draft','published','archived')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.mitigation_checklist_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 guide_id uuid NOT NULL REFERENCES public.mitigation_guides(id) ON DELETE RESTRICT,
 phase text NOT NULL CHECK(phase IN ('before','during','after')),
 instruction text NOT NULL,
 sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order>=0),
 is_active boolean NOT NULL DEFAULT true,
 UNIQUE(guide_id,phase,sort_order)
);

-- 17-19: official emergency contact, shelters and DEMO ONLY campaigns
CREATE TABLE public.emergency_contacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 region_id uuid REFERENCES public.regions(id) ON DELETE RESTRICT,
 organization_name text NOT NULL,
 service_type text NOT NULL,
 phone_number text,
 official_url text,
 is_verified boolean NOT NULL DEFAULT false,
 verified_at timestamptz,
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(phone_number IS NOT NULL OR official_url IS NOT NULL),
 CHECK(NOT is_verified OR verified_at IS NOT NULL)
);
CREATE TABLE public.relief_locations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid REFERENCES public.disaster_events(id) ON DELETE SET NULL,
 region_id uuid REFERENCES public.regions(id) ON DELETE RESTRICT,
 name text NOT NULL,
 location_type text NOT NULL CHECK(location_type IN ('shelter','command_post','aid_point')),
 coordinates extensions.geography(Point,4326),
 address text,
 verification_status text NOT NULL DEFAULT 'unverified' CHECK(verification_status IN ('unverified','verified')),
 source_url text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.donation_campaigns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid REFERENCES public.disaster_events(id) ON DELETE SET NULL,
 region_id uuid REFERENCES public.regions(id) ON DELETE RESTRICT,
 title text NOT NULL,
 organization_name text NOT NULL,
 description text,
 simulation_target_amount numeric(15,2) CHECK(simulation_target_amount IS NULL OR simulation_target_amount>=0),
 is_simulation boolean NOT NULL DEFAULT true CHECK(is_simulation),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);

-- 20-23: push rule, subscriptions and delivery attempts
CREATE TABLE public.notification_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text NOT NULL UNIQUE,
 disaster_type text,
 minimum_severity text,
 enabled boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.notification_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 region_id uuid REFERENCES public.regions(id) ON DELETE RESTRICT,
 platform text NOT NULL CHECK(platform IN ('web','android','ios')),
 endpoint_hash text NOT NULL UNIQUE,
 token_encrypted text, -- encrypted platform token / serialized protected subscription; backend only
 permission_status text NOT NULL DEFAULT 'unknown' CHECK(permission_status IN ('granted','denied','unknown')),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 rule_id uuid REFERENCES public.notification_rules(id) ON DELETE SET NULL,
 event_id uuid REFERENCES public.disaster_events(id) ON DELETE SET NULL,
 dedupe_key text NOT NULL UNIQUE,
 title text NOT NULL,
 body text NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','completed','failed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.notification_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE RESTRICT,
 subscription_id uuid NOT NULL REFERENCES public.notification_subscriptions(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
 error_message text,
 sent_at timestamptz,
 UNIQUE(notification_id,subscription_id)
);

-- 24-26: audit, settings, idempotency
CREATE TABLE public.audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid REFERENCES public.staff_profiles(user_id) ON DELETE SET NULL,
 action text NOT NULL,
 entity_type text NOT NULL,
 entity_id uuid,
 old_values jsonb,
 new_values jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.app_settings (
 key text PRIMARY KEY,
 value jsonb NOT NULL,
 updated_by uuid REFERENCES public.staff_profiles(user_id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.api_idempotency_keys (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 scope text NOT NULL,
 key_hash text NOT NULL,
 request_hash text NOT NULL,
 processing_status text NOT NULL DEFAULT 'processing' CHECK(processing_status IN ('processing','completed','failed')),
 resource_id uuid,
 expires_at timestamptz NOT NULL,
 UNIQUE(scope,key_hash)
);

-- Query indexes (PK and UNIQUE indexes already exist)
CREATE INDEX idx_regions_parent ON public.regions(parent_id);
CREATE INDEX idx_sync_source_time ON public.source_sync_logs(source_id,started_at DESC);
CREATE INDEX idx_events_region_time ON public.disaster_events(region_id,occurred_at DESC);
CREATE INDEX idx_events_time ON public.disaster_events(occurred_at DESC);
CREATE INDEX idx_updates_event_time ON public.event_updates(event_id,recorded_at DESC);
CREATE INDEX idx_event_locations_event ON public.event_locations(event_id);
CREATE INDEX idx_event_locations_geo ON public.event_locations USING gist(coordinates);
CREATE INDEX idx_reports_status_time ON public.public_reports(status,created_at DESC);
CREATE INDEX idx_reports_region ON public.public_reports(region_id);
CREATE INDEX idx_reports_geo ON public.public_reports USING gist(coordinates);
CREATE INDEX idx_report_history ON public.report_status_history(report_id,changed_at DESC);
CREATE INDEX idx_report_attachments ON public.report_attachments(report_id);
CREATE INDEX idx_tokens_report ON public.report_access_tokens(report_id);
CREATE INDEX idx_articles_pub ON public.articles(publication_status,published_at DESC);
CREATE INDEX idx_checklists_guide ON public.mitigation_checklist_items(guide_id,phase,sort_order);
CREATE INDEX idx_relief_geo ON public.relief_locations USING gist(coordinates);
CREATE INDEX idx_notifications_region ON public.notification_subscriptions(region_id,is_active);
CREATE INDEX idx_deliveries_status ON public.notification_deliveries(status);
CREATE INDEX idx_audit_entity ON public.audit_logs(entity_type,entity_id,created_at DESC);
CREATE INDEX idx_idempotency_expiry ON public.api_idempotency_keys(expires_at);

-- Helpers and integrity triggers
CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.disaster_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.public_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_articles_updated BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_guides_updated BEFORE UPDATE ON public.mitigation_guides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_relief_updated BEFORE UPDATE ON public.relief_locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Security definer role checker, avoids recursive staff role policies.
CREATE FUNCTION public.has_staff_role(p_codes text[]) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.staff_profiles sp
  JOIN public.staff_role_assignments sra ON sra.staff_id=sp.user_id
  JOIN public.roles r ON r.id=sra.role_id
  WHERE sp.user_id=(SELECT auth.uid()) AND sp.is_active AND r.code=ANY(p_codes)
 ); $$;
REVOKE ALL ON FUNCTION public.has_staff_role(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_staff_role(text[]) TO authenticated;

-- All 26 tables have RLS; public read is limited to publishable non-sensitive data.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY[
 'regions','data_sources','source_sync_logs','staff_profiles','roles','staff_role_assignments',
 'disaster_events','event_updates','event_locations','public_reports','report_attachments',
 'report_status_history','report_access_tokens','articles','mitigation_guides',
 'mitigation_checklist_items','emergency_contacts','relief_locations','donation_campaigns',
 'notification_rules','notification_subscriptions','notifications','notification_deliveries',
 'audit_logs','app_settings','api_idempotency_keys'
 ] LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t); END LOOP;
END $$;

-- Deny write by default through revoking DML on tables; explicitly grant for authorized staff.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY[
 'regions','data_sources','source_sync_logs','staff_profiles','roles','staff_role_assignments',
 'disaster_events','event_updates','event_locations','public_reports','report_attachments',
 'report_status_history','report_access_tokens','articles','mitigation_guides',
 'mitigation_checklist_items','emergency_contacts','relief_locations','donation_campaigns',
 'notification_rules','notification_subscriptions','notifications','notification_deliveries',
 'audit_logs','app_settings','api_idempotency_keys'
 ] LOOP EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',t); END LOOP;
END $$;
-- publicly readable reference rows and published information
GRANT SELECT ON public.regions,public.data_sources,public.disaster_events,public.event_updates,public.event_locations,
 public.articles,public.mitigation_guides,public.mitigation_checklist_items,public.emergency_contacts,
 public.relief_locations,public.donation_campaigns TO anon,authenticated;
CREATE POLICY regions_public_read ON public.regions FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY sources_public_read ON public.data_sources FOR SELECT TO anon,authenticated USING(is_active);
CREATE POLICY events_public_read ON public.disaster_events FOR SELECT TO anon,authenticated USING(published_at IS NOT NULL AND verification_status <> 'unconfirmed');
CREATE POLICY event_updates_public_read ON public.event_updates FOR SELECT TO anon,authenticated USING(
 EXISTS(SELECT 1 FROM public.disaster_events e WHERE e.id=event_id AND e.published_at IS NOT NULL AND e.verification_status<>'unconfirmed'));
CREATE POLICY event_locations_public_read ON public.event_locations FOR SELECT TO anon,authenticated USING(
 EXISTS(SELECT 1 FROM public.disaster_events e WHERE e.id=event_id AND e.published_at IS NOT NULL AND e.verification_status<>'unconfirmed'));
CREATE POLICY articles_public_read ON public.articles FOR SELECT TO anon,authenticated USING(publication_status='published' AND published_at IS NOT NULL);
CREATE POLICY guides_public_read ON public.mitigation_guides FOR SELECT TO anon,authenticated USING(publication_status='published');
CREATE POLICY checklist_public_read ON public.mitigation_checklist_items FOR SELECT TO anon,authenticated USING(is_active AND EXISTS(
 SELECT 1 FROM public.mitigation_guides g WHERE g.id=guide_id AND g.publication_status='published'));
CREATE POLICY emergency_public_read ON public.emergency_contacts FOR SELECT TO anon,authenticated USING(is_verified AND is_active);
CREATE POLICY relief_public_read ON public.relief_locations FOR SELECT TO anon,authenticated USING(verification_status='verified');
CREATE POLICY donations_public_read ON public.donation_campaigns FOR SELECT TO anon,authenticated USING(is_active AND is_simulation);

-- Staff access: roles are checked in Postgres; no direct anonymous writes.
GRANT SELECT ON public.staff_profiles,public.roles,public.staff_role_assignments TO authenticated;
CREATE POLICY staff_profiles_read ON public.staff_profiles FOR SELECT TO authenticated USING(
 user_id=(SELECT auth.uid()) OR public.has_staff_role(ARRAY['super_admin']));
CREATE POLICY roles_staff_read ON public.roles FOR SELECT TO authenticated USING(public.has_staff_role(ARRAY['super_admin']));
CREATE POLICY assignment_staff_read ON public.staff_role_assignments FOR SELECT TO authenticated USING(
 staff_id=(SELECT auth.uid()) OR public.has_staff_role(ARRAY['super_admin']));
-- Administrator profile & role provisioning is server-side only (service role / privileged migrations).

-- Staff data administration (ownership handled by permissions, all writes role-restricted)
GRANT INSERT,UPDATE,DELETE ON public.disaster_events,public.event_updates,public.event_locations,
 public.articles,public.mitigation_guides,public.mitigation_checklist_items,public.emergency_contacts,
 public.relief_locations,public.donation_campaigns TO authenticated;
GRANT SELECT ON public.disaster_events,public.event_updates,public.event_locations,public.articles,
 public.mitigation_guides,public.mitigation_checklist_items,public.emergency_contacts,
 public.relief_locations,public.donation_campaigns TO authenticated;

CREATE POLICY events_staff_all ON public.disaster_events FOR ALL TO authenticated USING(public.has_staff_role(ARRAY['super_admin','information_manager'])) WITH CHECK(public.has_staff_role(ARRAY['super_admin','information_manager']));
CREATE POLICY updates_staff_all ON public.event_updates FOR ALL TO authenticated USING(public.has_staff_role(ARRAY['super_admin','information_manager'])) WITH CHECK(public.has_staff_role(ARRAY['super_admin','information_manager']));
CREATE POLICY locations_staff_all ON public.event_locations FOR ALL TO authenticated USING(public.has_staff_role(ARRAY['super_admin','information_manager'])) WITH CHECK(public.has_staff_role(ARRAY['super_admin','information_manager']));
CREATE POLICY articles_staff_all ON public.articles FOR ALL TO authenticated USING(public.has_staff_role(ARRAY['super_admin','information_manager'])) WITH CHECK(public.has_staff_role(ARRAY['super_admin','information_manager']));
CREATE POLICY guides_staff_all ON public.mitigation_guides FOR ALL TO authenticated USING(public.has_staff_role(ARRAY['super_admin','mitigation_editor'])) WITH CHECK(public.has_staff_role(ARRAY['super_admin','mitigation_editor']));
CREATE POLICY checklist_staff_all ON public.mitigation_checklist_items FOR ALL TO authenticated USING(public.has_staff_role(ARRAY['super_admin','mitigation_editor'])) WITH CHECK(public.has_staff_role(ARRAY['super_admin','mitigation_editor']));
CREATE POLICY emergency_staff_all ON public.emergency_contacts FOR ALL TO authenticated USING(public.has_staff_role(ARRAY['super_admin','information_manager'])) WITH CHECK(public.has_staff_role(ARRAY['super_admin','information_manager']));
CREATE POLICY relief_staff_all ON public.relief_locations FOR ALL TO authenticated USING(public.has_staff_role(ARRAY['super_admin','information_manager'])) WITH CHECK(public.has_staff_role(ARRAY['super_admin','information_manager']));
CREATE POLICY donations_staff_all ON public.donation_campaigns FOR ALL TO authenticated USING(public.has_staff_role(ARRAY['super_admin','information_manager'])) WITH CHECK(public.has_staff_role(ARRAY['super_admin','information_manager']));

-- Sensitive report tables: read/review only by staff; never public direct INSERT/SELECT.
GRANT SELECT,UPDATE ON public.public_reports TO authenticated;
GRANT SELECT ON public.report_attachments,public.report_status_history TO authenticated;
CREATE POLICY reports_staff_read ON public.public_reports FOR SELECT TO authenticated USING(public.has_staff_role(ARRAY['super_admin','report_verifier']));
CREATE POLICY reports_staff_update ON public.public_reports FOR UPDATE TO authenticated USING(public.has_staff_role(ARRAY['super_admin','report_verifier'])) WITH CHECK(public.has_staff_role(ARRAY['super_admin','report_verifier']));
CREATE POLICY attachments_staff_read ON public.report_attachments FOR SELECT TO authenticated USING(public.has_staff_role(ARRAY['super_admin','report_verifier']));
CREATE POLICY report_history_staff_read ON public.report_status_history FOR SELECT TO authenticated USING(public.has_staff_role(ARRAY['super_admin','report_verifier']));
-- Direct report UPDATE is deliberately not the recommended review interface: use RPC below.

-- The only public report ingestion entry point: hardened field bounds and secret tracking token.
-- IMPORTANT: rate limiting / CAPTCHA / anti-spam MUST be enforced by a separate Edge Function
-- before exposing this RPC broadly; do not use public RPC directly in a production service.
CREATE FUNCTION public.submit_public_report(
 p_report_type text, p_title text, p_description text,
 p_region_id uuid DEFAULT NULL, p_location_description text DEFAULT NULL,
 p_latitude double precision DEFAULT NULL, p_longitude double precision DEFAULT NULL
) RETURNS TABLE(tracking_code text, access_token text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_report_id uuid; v_code text; v_token text; v_coordinates extensions.geography;
BEGIN
 IF p_report_type IS NULL OR length(trim(p_report_type)) NOT BETWEEN 2 AND 50
 OR p_title IS NULL OR length(trim(p_title)) NOT BETWEEN 5 AND 180
 OR p_description IS NULL OR length(trim(p_description)) NOT BETWEEN 10 AND 5000
 OR (p_latitude IS NULL) <> (p_longitude IS NULL)
 OR (p_latitude IS NOT NULL AND (p_latitude < -90 OR p_latitude > 90 OR p_longitude < -180 OR p_longitude > 180))
 OR length(coalesce(p_location_description,''))>500 THEN
  RAISE EXCEPTION 'Invalid report fields' USING ERRCODE='22023';
 END IF;
 IF p_latitude IS NOT NULL THEN
  v_coordinates := extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude,p_latitude),4326)::extensions.geography;
 END IF;
 v_code := 'RS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,16));
 v_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
 INSERT INTO public.public_reports(tracking_code,region_id,report_type,title,description,coordinates,location_description)
 VALUES(v_code,p_region_id,trim(p_report_type),trim(p_title),trim(p_description),v_coordinates,nullif(trim(p_location_description),''))
 RETURNING id INTO v_report_id;
 INSERT INTO public.report_access_tokens(report_id,token_hash,expires_at)
 VALUES(v_report_id,encode(sha256(convert_to(v_token,'UTF8')),'hex'),now()+interval '90 days');
 INSERT INTO public.report_status_history(report_id,to_status,reason)
 VALUES(v_report_id,'unverified','Initial anonymous submission');
 tracking_code:=v_code; access_token:=v_token; RETURN NEXT;
END; $$;
REVOKE ALL ON FUNCTION public.submit_public_report(text,text,text,uuid,text,double precision,double precision) FROM PUBLIC;
-- This grant makes the RPC callable by anyone who knows the endpoint.
-- For the student MVP, expose through an Edge Function that applies rate limits and CAPTCHA.
-- Edge Functions use the service_role credential on the server ONLY.
GRANT EXECUTE ON FUNCTION public.submit_public_report(text,text,text,uuid,text,double precision,double precision) TO service_role;

CREATE FUNCTION public.track_public_report(p_tracking_code text,p_access_token text)
 RETURNS TABLE(report_status text, created_at timestamptz, updated_at timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT r.status,r.created_at,r.updated_at
 FROM public.public_reports r
 JOIN public.report_access_tokens t ON t.report_id=r.id
 WHERE r.tracking_code=p_tracking_code
 AND t.token_hash=encode(sha256(convert_to(p_access_token,'UTF8')),'hex')
 AND t.expires_at>now() AND t.revoked_at IS NULL
 LIMIT 1; $$;
REVOKE ALL ON FUNCTION public.track_public_report(text,text) FROM PUBLIC;
-- Expose via Edge Function after rate limiting and verifying token; do not grant anon here.
GRANT EXECUTE ON FUNCTION public.track_public_report(text,text) TO service_role;

-- Status transitions and immutable review history are handled atomically by backend.
CREATE FUNCTION public.review_public_report(p_report_id uuid,p_new_status text,p_reason text DEFAULT NULL)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_old text;
BEGIN
 IF NOT public.has_staff_role(ARRAY['super_admin','report_verifier']) THEN
  RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
 END IF;
 IF p_new_status NOT IN ('under_review','verified','rejected') THEN
  RAISE EXCEPTION 'Invalid target status' USING ERRCODE='22023';
 END IF;
 SELECT status INTO v_old FROM public.public_reports WHERE id=p_report_id FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF NOT ((v_old='unverified' AND p_new_status IN ('under_review','verified','rejected'))
 OR (v_old='under_review' AND p_new_status IN ('verified','rejected'))) THEN
  RAISE EXCEPTION 'Invalid status transition' USING ERRCODE='22023';
 END IF;
 UPDATE public.public_reports SET status=p_new_status,reviewed_by=auth.uid(),reviewed_at=now()
 WHERE id=p_report_id;
 INSERT INTO public.report_status_history(report_id,from_status,to_status,changed_by,reason)
 VALUES(p_report_id,v_old,p_new_status,auth.uid(),p_reason);
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.review_public_report(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_public_report(uuid,text,text) TO authenticated;

-- Restrict direct updates of sensitive status-related fields; use review RPC exclusively.
-- Removing authenticated UPDATE grant blocks even legitimate direct updates and forces RPC.
REVOKE UPDATE ON public.public_reports FROM authenticated;
DROP POLICY reports_staff_update ON public.public_reports;

INSERT INTO public.roles(code,name,description) VALUES
('super_admin','Super Administrator','System management'),
('information_manager','Information Manager','Disaster data and articles'),
('report_verifier','Report Verifier','Review community reports'),
('mitigation_editor','Mitigation Editor','Maintain disaster guidance');
INSERT INTO public.data_sources(name,source_type,official_url) VALUES
('BMKG','official_api','https://data.bmkg.go.id'),
('RekanSiaga Admin','manual',NULL);

-- Do not grant broad INSERT/UPDATE/DELETE on operational tables to anon/authenticated.
-- Backend using service-role should guard every request, credential, and trusted data feed.

-- Normalize ACLs of NEW bootstrap objects only. Do not change DEFAULT PRIVILEGES.
-- REVOKE FROM PUBLIC alone does not remove explicit anon/authenticated defaults.
REVOKE ALL ON FUNCTION public.has_staff_role(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_staff_role(text[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.review_public_report(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_public_report(uuid,text,text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.submit_public_report(text,text,text,uuid,text,double precision,double precision)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_report(text,text,text,uuid,text,double precision,double precision)
 TO service_role;
REVOKE ALL ON FUNCTION public.track_public_report(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_public_report(text,text) TO service_role;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
-- set_updated_at remains an invoker trigger; existing trigger invocation does not
-- require granting direct client RPC EXECUTE. Owner/service defaults retained.

-- Metadata checkpoint INSIDE this transaction, before deliberate ROLLBACK.
-- This is not persisted staging/API verification. Review event-trigger effects
-- and run the full inspector/structure queries here if a longer dry-run is
-- approved, before the same-session rollback. Do not COMMIT or invoke app RPCs.
SELECT jsonb_build_object(
 'kind','IN_TRANSACTION_DRY_RUN_NOT_PERSISTED',
 'public_table_count',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind IN ('r','p')),
 'public_tables_rls_enabled',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relrowsecurity),
 'public_routine_count',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public'),
 'existing_function_definition_md5',(SELECT md5(pg_get_functiondef(p.oid))
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='rls_auto_enable' AND p.pronargs=0),
 'existing_event',(SELECT jsonb_build_object('owner',pg_get_userbyid(e.evtowner),
   'event',e.evtevent,'enabled',e.evtenabled,'tags',e.evttags,
   'function',e.evtfoid::regprocedure::text)
   FROM pg_event_trigger e WHERE e.evtname='ensure_rls')
) AS phase4a3_dry_run_checkpoint;
ROLLBACK;
