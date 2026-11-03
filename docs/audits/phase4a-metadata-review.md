# Phase 4A ? Inventaris metadata remote

Sumber: [JSON audit](phase4a-security-audit-result.json). Snapshot 2026-10-22T14:07:56.340869+00:00. Reviewed locally by Codex; SQL executed remotely by user. No authenticated API tests.

SHA256: `b5eb27fcf897297885f247914835d2c3f1120ee660283829a4e4a9136f331d49`.

26 tabel / 200 kolom / 106 constraints / 61 index / 26 policies / 7 functions.

## Inventory dan grants

Semua tabel berikut RLS enabled, FORCE RLS false, owner postgres. Grants tabel bukan izin efektif baris; policy/helper tetap berlaku. S=SELECT, I=INSERT, U=UPDATE, D=DELETE, ?=tidak ada.

| Tabel | Kolom | PK | FK | UNIQUE constraint | Index | Policies | anon | authenticated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| api_idempotency_keys | 7 | 1 | 0 | 1 | 3 | 0 | ? | ? |
| app_settings | 4 | 1 | 1 | 0 | 1 | 0 | ? | ? |
| articles | 12 | 1 | 1 | 1 | 3 | 2 | S | SIUD |
| audit_logs | 8 | 1 | 1 | 0 | 2 | 0 | ? | ? |
| data_sources | 7 | 1 | 0 | 1 | 2 | 1 | S | S |
| disaster_events | 16 | 1 | 2 | 0 | 4 | 2 | S | SIUD |
| donation_campaigns | 10 | 1 | 2 | 0 | 1 | 2 | S | SIUD |
| emergency_contacts | 10 | 1 | 1 | 0 | 1 | 2 | S | SIUD |
| event_locations | 7 | 1 | 2 | 0 | 4 | 2 | S | SIUD |
| event_updates | 7 | 1 | 2 | 0 | 2 | 2 | S | SIUD |
| mitigation_checklist_items | 6 | 1 | 1 | 1 | 3 | 2 | S | SIUD |
| mitigation_guides | 10 | 1 | 1 | 0 | 1 | 2 | S | SIUD |
| notification_deliveries | 7 | 1 | 2 | 1 | 3 | 0 | ? | ? |
| notification_rules | 6 | 1 | 0 | 1 | 2 | 0 | ? | ? |
| notification_subscriptions | 8 | 1 | 1 | 1 | 3 | 0 | ? | ? |
| notifications | 8 | 1 | 2 | 1 | 2 | 0 | ? | ? |
| public_reports | 14 | 1 | 3 | 1 | 5 | 1 | ? | S |
| regions | 6 | 1 | 1 | 1 | 3 | 1 | S | S |
| relief_locations | 10 | 1 | 2 | 0 | 2 | 2 | S | SIUD |
| report_access_tokens | 6 | 1 | 1 | 1 | 3 | 0 | ? | ? |
| report_attachments | 6 | 1 | 1 | 1 | 3 | 1 | ? | S |
| report_status_history | 7 | 1 | 2 | 0 | 2 | 1 | ? | S |
| roles | 4 | 1 | 0 | 1 | 2 | 1 | ? | S |
| source_sync_logs | 7 | 1 | 1 | 0 | 2 | 0 | ? | ? |
| staff_profiles | 4 | 1 | 1 | 0 | 1 | 1 | ? | S |
| staff_role_assignments | 3 | 1 | 2 | 0 | 1 | 1 | ? | S |

Seluruh 106 constraint convalidated=true; 61 index indisvalid=true (41 unique). Semua 400 hasil grants kolom S/I/U sama dengan grants tabel terkait; tidak ada grant kolom tersembunyi yang menambah hak. Kedua client role tidak memiliki superuser/BYPASSRLS/CREATEROLE/CREATEDB atau CREATE schema. Tidak ada membership yang memberikan role istimewa kepada anon/authenticated.

## Seluruh kolom, constraints dan index

### api_idempotency_keys

```text
id uuid NOT NULL
scope text NOT NULL
key_hash text NOT NULL
request_hash text NOT NULL
processing_status text NOT NULL
resource_id uuid NULL
expires_at timestamp with time zone NOT NULL
api_idempotency_keys_pkey: PRIMARY KEY (id)
api_idempotency_keys_processing_status_check: CHECK (processing_status = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text]))
api_idempotency_keys_scope_key_hash_key: UNIQUE (scope, key_hash)
CREATE UNIQUE INDEX api_idempotency_keys_pkey ON public.api_idempotency_keys USING btree (id)
CREATE UNIQUE INDEX api_idempotency_keys_scope_key_hash_key ON public.api_idempotency_keys USING btree (scope, key_hash)
CREATE INDEX idx_idempotency_expiry ON public.api_idempotency_keys USING btree (expires_at)
```

### app_settings

```text
key text NOT NULL
value jsonb NOT NULL
updated_by uuid NULL
updated_at timestamp with time zone NOT NULL
app_settings_pkey: PRIMARY KEY (key)
app_settings_updated_by_fkey: FOREIGN KEY (updated_by) REFERENCES staff_profiles(user_id) ON DELETE SET NULL
CREATE UNIQUE INDEX app_settings_pkey ON public.app_settings USING btree (key)
```

### articles

```text
id uuid NOT NULL
author_id uuid NULL
title text NOT NULL
slug text NOT NULL
summary text NULL
content text NOT NULL
cover_image_path text NULL
source_url text NULL
publication_status text NOT NULL
published_at timestamp with time zone NULL
created_at timestamp with time zone NOT NULL
updated_at timestamp with time zone NOT NULL
articles_author_id_fkey: FOREIGN KEY (author_id) REFERENCES staff_profiles(user_id) ON DELETE SET NULL
articles_check: CHECK (publication_status <> 'published'::text OR published_at IS NOT NULL)
articles_pkey: PRIMARY KEY (id)
articles_publication_status_check: CHECK (publication_status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))
articles_slug_key: UNIQUE (slug)
CREATE UNIQUE INDEX articles_pkey ON public.articles USING btree (id)
CREATE UNIQUE INDEX articles_slug_key ON public.articles USING btree (slug)
CREATE INDEX idx_articles_pub ON public.articles USING btree (publication_status, published_at DESC)
```

### audit_logs

```text
id uuid NOT NULL
actor_id uuid NULL
action text NOT NULL
entity_type text NOT NULL
entity_id uuid NULL
old_values jsonb NULL
new_values jsonb NULL
created_at timestamp with time zone NOT NULL
audit_logs_actor_id_fkey: FOREIGN KEY (actor_id) REFERENCES staff_profiles(user_id) ON DELETE SET NULL
audit_logs_pkey: PRIMARY KEY (id)
CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id)
CREATE INDEX idx_audit_entity ON public.audit_logs USING btree (entity_type, entity_id, created_at DESC)
```

### data_sources

```text
id uuid NOT NULL
name text NOT NULL
source_type text NOT NULL
official_url text NULL
api_identifier text NULL
is_active boolean NOT NULL
created_at timestamp with time zone NOT NULL
data_sources_name_key: UNIQUE (name)
data_sources_pkey: PRIMARY KEY (id)
data_sources_source_type_check: CHECK (source_type = ANY (ARRAY['official_api'::text, 'manual'::text, 'other'::text]))
CREATE UNIQUE INDEX data_sources_pkey ON public.data_sources USING btree (id)
CREATE UNIQUE INDEX data_sources_name_key ON public.data_sources USING btree (name)
```

### disaster_events

```text
id uuid NOT NULL
source_id uuid NOT NULL
external_id text NULL
region_id uuid NULL
disaster_type text NOT NULL
title text NOT NULL
description text NULL
severity text NULL
verification_status text NOT NULL
event_status text NOT NULL
occurred_at timestamp with time zone NULL
source_updated_at timestamp with time zone NULL
fetched_at timestamp with time zone NULL
published_at timestamp with time zone NULL
created_at timestamp with time zone NOT NULL
updated_at timestamp with time zone NOT NULL
disaster_events_event_status_check: CHECK (event_status = ANY (ARRAY['unknown'::text, 'ongoing'::text, 'resolved'::text]))
disaster_events_pkey: PRIMARY KEY (id)
disaster_events_region_id_fkey: FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT
disaster_events_source_id_fkey: FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE RESTRICT
disaster_events_verification_status_check: CHECK (verification_status = ANY (ARRAY['unconfirmed'::text, 'source_confirmed'::text, 'staff_verified'::text]))
CREATE UNIQUE INDEX disaster_events_pkey ON public.disaster_events USING btree (id)
CREATE UNIQUE INDEX uq_disaster_source_external ON public.disaster_events USING btree (source_id, external_id) WHERE (external_id IS NOT NULL)
CREATE INDEX idx_events_region_time ON public.disaster_events USING btree (region_id, occurred_at DESC)
CREATE INDEX idx_events_time ON public.disaster_events USING btree (occurred_at DESC)
```

### donation_campaigns

```text
id uuid NOT NULL
event_id uuid NULL
region_id uuid NULL
title text NOT NULL
organization_name text NOT NULL
description text NULL
simulation_target_amount numeric(15,2) NULL
is_simulation boolean NOT NULL
is_active boolean NOT NULL
created_at timestamp with time zone NOT NULL
donation_campaigns_event_id_fkey: FOREIGN KEY (event_id) REFERENCES disaster_events(id) ON DELETE SET NULL
donation_campaigns_is_simulation_check: CHECK (is_simulation)
donation_campaigns_pkey: PRIMARY KEY (id)
donation_campaigns_region_id_fkey: FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT
donation_campaigns_simulation_target_amount_check: CHECK (simulation_target_amount IS NULL OR simulation_target_amount >= 0::numeric)
CREATE UNIQUE INDEX donation_campaigns_pkey ON public.donation_campaigns USING btree (id)
```

### emergency_contacts

```text
id uuid NOT NULL
region_id uuid NULL
organization_name text NOT NULL
service_type text NOT NULL
phone_number text NULL
official_url text NULL
is_verified boolean NOT NULL
verified_at timestamp with time zone NULL
is_active boolean NOT NULL
created_at timestamp with time zone NOT NULL
emergency_contacts_check: CHECK (phone_number IS NOT NULL OR official_url IS NOT NULL)
emergency_contacts_check1: CHECK (NOT is_verified OR verified_at IS NOT NULL)
emergency_contacts_pkey: PRIMARY KEY (id)
emergency_contacts_region_id_fkey: FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT
CREATE UNIQUE INDEX emergency_contacts_pkey ON public.emergency_contacts USING btree (id)
```

### event_locations

```text
id uuid NOT NULL
event_id uuid NOT NULL
region_id uuid NULL
label text NOT NULL
location_type text NOT NULL
coordinates geography(Point,4326) NULL
is_primary boolean NOT NULL
event_locations_event_id_fkey: FOREIGN KEY (event_id) REFERENCES disaster_events(id) ON DELETE RESTRICT
event_locations_location_type_check: CHECK (location_type = ANY (ARRAY['epicenter'::text, 'affected_area'::text, 'other'::text]))
event_locations_pkey: PRIMARY KEY (id)
event_locations_region_id_fkey: FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT
CREATE UNIQUE INDEX event_locations_pkey ON public.event_locations USING btree (id)
CREATE UNIQUE INDEX uq_one_primary_event_location ON public.event_locations USING btree (event_id) WHERE is_primary
CREATE INDEX idx_event_locations_event ON public.event_locations USING btree (event_id)
CREATE INDEX idx_event_locations_geo ON public.event_locations USING gist (coordinates)
```

### event_updates

```text
id uuid NOT NULL
event_id uuid NOT NULL
update_type text NOT NULL
description text NOT NULL
source_updated_at timestamp with time zone NULL
recorded_at timestamp with time zone NOT NULL
recorded_by uuid NULL
event_updates_event_id_fkey: FOREIGN KEY (event_id) REFERENCES disaster_events(id) ON DELETE RESTRICT
event_updates_pkey: PRIMARY KEY (id)
event_updates_recorded_by_fkey: FOREIGN KEY (recorded_by) REFERENCES staff_profiles(user_id) ON DELETE SET NULL
CREATE UNIQUE INDEX event_updates_pkey ON public.event_updates USING btree (id)
CREATE INDEX idx_updates_event_time ON public.event_updates USING btree (event_id, recorded_at DESC)
```

### mitigation_checklist_items

```text
id uuid NOT NULL
guide_id uuid NOT NULL
phase text NOT NULL
instruction text NOT NULL
sort_order integer NOT NULL
is_active boolean NOT NULL
mitigation_checklist_items_guide_id_fkey: FOREIGN KEY (guide_id) REFERENCES mitigation_guides(id) ON DELETE RESTRICT
mitigation_checklist_items_guide_id_phase_sort_order_key: UNIQUE (guide_id, phase, sort_order)
mitigation_checklist_items_phase_check: CHECK (phase = ANY (ARRAY['before'::text, 'during'::text, 'after'::text]))
mitigation_checklist_items_pkey: PRIMARY KEY (id)
mitigation_checklist_items_sort_order_check: CHECK (sort_order >= 0)
CREATE UNIQUE INDEX mitigation_checklist_items_pkey ON public.mitigation_checklist_items USING btree (id)
CREATE UNIQUE INDEX mitigation_checklist_items_guide_id_phase_sort_order_key ON public.mitigation_checklist_items USING btree (guide_id, phase, sort_order)
CREATE INDEX idx_checklists_guide ON public.mitigation_checklist_items USING btree (guide_id, phase, sort_order)
```

### mitigation_guides

```text
id uuid NOT NULL
author_id uuid NULL
disaster_type text NOT NULL
title text NOT NULL
summary text NULL
content text NOT NULL
source_url text NULL
publication_status text NOT NULL
created_at timestamp with time zone NOT NULL
updated_at timestamp with time zone NOT NULL
mitigation_guides_author_id_fkey: FOREIGN KEY (author_id) REFERENCES staff_profiles(user_id) ON DELETE SET NULL
mitigation_guides_pkey: PRIMARY KEY (id)
mitigation_guides_publication_status_check: CHECK (publication_status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))
CREATE UNIQUE INDEX mitigation_guides_pkey ON public.mitigation_guides USING btree (id)
```

### notification_deliveries

```text
id uuid NOT NULL
notification_id uuid NOT NULL
subscription_id uuid NOT NULL
status text NOT NULL
attempts integer NOT NULL
error_message text NULL
sent_at timestamp with time zone NULL
notification_deliveries_attempts_check: CHECK (attempts >= 0)
notification_deliveries_notification_id_fkey: FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE RESTRICT
notification_deliveries_notification_id_subscription_id_key: UNIQUE (notification_id, subscription_id)
notification_deliveries_pkey: PRIMARY KEY (id)
notification_deliveries_status_check: CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text]))
notification_deliveries_subscription_id_fkey: FOREIGN KEY (subscription_id) REFERENCES notification_subscriptions(id) ON DELETE RESTRICT
CREATE UNIQUE INDEX notification_deliveries_pkey ON public.notification_deliveries USING btree (id)
CREATE UNIQUE INDEX notification_deliveries_notification_id_subscription_id_key ON public.notification_deliveries USING btree (notification_id, subscription_id)
CREATE INDEX idx_deliveries_status ON public.notification_deliveries USING btree (status)
```

### notification_rules

```text
id uuid NOT NULL
code text NOT NULL
disaster_type text NULL
minimum_severity text NULL
enabled boolean NOT NULL
created_at timestamp with time zone NOT NULL
notification_rules_code_key: UNIQUE (code)
notification_rules_pkey: PRIMARY KEY (id)
CREATE UNIQUE INDEX notification_rules_pkey ON public.notification_rules USING btree (id)
CREATE UNIQUE INDEX notification_rules_code_key ON public.notification_rules USING btree (code)
```

### notification_subscriptions

```text
id uuid NOT NULL
region_id uuid NULL
platform text NOT NULL
endpoint_hash text NOT NULL
token_encrypted text NULL
permission_status text NOT NULL
is_active boolean NOT NULL
created_at timestamp with time zone NOT NULL
notification_subscriptions_endpoint_hash_key: UNIQUE (endpoint_hash)
notification_subscriptions_permission_status_check: CHECK (permission_status = ANY (ARRAY['granted'::text, 'denied'::text, 'unknown'::text]))
notification_subscriptions_pkey: PRIMARY KEY (id)
notification_subscriptions_platform_check: CHECK (platform = ANY (ARRAY['web'::text, 'android'::text, 'ios'::text]))
notification_subscriptions_region_id_fkey: FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT
CREATE UNIQUE INDEX notification_subscriptions_pkey ON public.notification_subscriptions USING btree (id)
CREATE UNIQUE INDEX notification_subscriptions_endpoint_hash_key ON public.notification_subscriptions USING btree (endpoint_hash)
CREATE INDEX idx_notifications_region ON public.notification_subscriptions USING btree (region_id, is_active)
```

### notifications

```text
id uuid NOT NULL
rule_id uuid NULL
event_id uuid NULL
dedupe_key text NOT NULL
title text NOT NULL
body text NOT NULL
status text NOT NULL
created_at timestamp with time zone NOT NULL
notifications_dedupe_key_key: UNIQUE (dedupe_key)
notifications_event_id_fkey: FOREIGN KEY (event_id) REFERENCES disaster_events(id) ON DELETE SET NULL
notifications_pkey: PRIMARY KEY (id)
notifications_rule_id_fkey: FOREIGN KEY (rule_id) REFERENCES notification_rules(id) ON DELETE SET NULL
notifications_status_check: CHECK (status = ANY (ARRAY['queued'::text, 'processing'::text, 'completed'::text, 'failed'::text]))
CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id)
CREATE UNIQUE INDEX notifications_dedupe_key_key ON public.notifications USING btree (dedupe_key)
```

### public_reports

```text
id uuid NOT NULL
tracking_code text NOT NULL
event_id uuid NULL
region_id uuid NULL
report_type text NOT NULL
title text NOT NULL
description text NOT NULL
coordinates geography(Point,4326) NULL
location_description text NULL
status text NOT NULL
reviewed_by uuid NULL
reviewed_at timestamp with time zone NULL
created_at timestamp with time zone NOT NULL
updated_at timestamp with time zone NOT NULL
public_reports_description_check: CHECK (length(TRIM(BOTH FROM description)) >= 10 AND length(TRIM(BOTH FROM description)) <= 5000)
public_reports_event_id_fkey: FOREIGN KEY (event_id) REFERENCES disaster_events(id) ON DELETE SET NULL
public_reports_pkey: PRIMARY KEY (id)
public_reports_region_id_fkey: FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT
public_reports_reviewed_by_fkey: FOREIGN KEY (reviewed_by) REFERENCES staff_profiles(user_id) ON DELETE SET NULL
public_reports_status_check: CHECK (status = ANY (ARRAY['unverified'::text, 'under_review'::text, 'verified'::text, 'rejected'::text]))
public_reports_title_check: CHECK (length(TRIM(BOTH FROM title)) >= 5 AND length(TRIM(BOTH FROM title)) <= 180)
public_reports_tracking_code_key: UNIQUE (tracking_code)
CREATE UNIQUE INDEX public_reports_pkey ON public.public_reports USING btree (id)
CREATE UNIQUE INDEX public_reports_tracking_code_key ON public.public_reports USING btree (tracking_code)
CREATE INDEX idx_reports_status_time ON public.public_reports USING btree (status, created_at DESC)
CREATE INDEX idx_reports_region ON public.public_reports USING btree (region_id)
CREATE INDEX idx_reports_geo ON public.public_reports USING gist (coordinates)
```

### regions

```text
id uuid NOT NULL
parent_id uuid NULL
code text NOT NULL
name text NOT NULL
region_type text NOT NULL
created_at timestamp with time zone NOT NULL
regions_check: CHECK (parent_id IS NULL OR parent_id <> id)
regions_code_key: UNIQUE (code)
regions_parent_id_fkey: FOREIGN KEY (parent_id) REFERENCES regions(id) ON DELETE RESTRICT
regions_pkey: PRIMARY KEY (id)
regions_region_type_check: CHECK (region_type = ANY (ARRAY['province'::text, 'regency'::text, 'city'::text, 'district'::text, 'village'::text]))
CREATE UNIQUE INDEX regions_pkey ON public.regions USING btree (id)
CREATE UNIQUE INDEX regions_code_key ON public.regions USING btree (code)
CREATE INDEX idx_regions_parent ON public.regions USING btree (parent_id)
```

### relief_locations

```text
id uuid NOT NULL
event_id uuid NULL
region_id uuid NULL
name text NOT NULL
location_type text NOT NULL
coordinates geography(Point,4326) NULL
address text NULL
verification_status text NOT NULL
source_url text NULL
updated_at timestamp with time zone NOT NULL
relief_locations_event_id_fkey: FOREIGN KEY (event_id) REFERENCES disaster_events(id) ON DELETE SET NULL
relief_locations_location_type_check: CHECK (location_type = ANY (ARRAY['shelter'::text, 'command_post'::text, 'aid_point'::text]))
relief_locations_pkey: PRIMARY KEY (id)
relief_locations_region_id_fkey: FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT
relief_locations_verification_status_check: CHECK (verification_status = ANY (ARRAY['unverified'::text, 'verified'::text]))
CREATE UNIQUE INDEX relief_locations_pkey ON public.relief_locations USING btree (id)
CREATE INDEX idx_relief_geo ON public.relief_locations USING gist (coordinates)
```

### report_access_tokens

```text
id uuid NOT NULL
report_id uuid NOT NULL
token_hash text NOT NULL
expires_at timestamp with time zone NOT NULL
revoked_at timestamp with time zone NULL
created_at timestamp with time zone NOT NULL
report_access_tokens_pkey: PRIMARY KEY (id)
report_access_tokens_report_id_fkey: FOREIGN KEY (report_id) REFERENCES public_reports(id) ON DELETE RESTRICT
report_access_tokens_token_hash_key: UNIQUE (token_hash)
CREATE UNIQUE INDEX report_access_tokens_pkey ON public.report_access_tokens USING btree (id)
CREATE UNIQUE INDEX report_access_tokens_token_hash_key ON public.report_access_tokens USING btree (token_hash)
CREATE INDEX idx_tokens_report ON public.report_access_tokens USING btree (report_id)
```

### report_attachments

```text
id uuid NOT NULL
report_id uuid NOT NULL
storage_path text NOT NULL
mime_type text NOT NULL
file_size bigint NOT NULL
created_at timestamp with time zone NOT NULL
report_attachments_file_size_check: CHECK (file_size > 0 AND file_size <= 5242880)
report_attachments_mime_type_check: CHECK (mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text]))
report_attachments_pkey: PRIMARY KEY (id)
report_attachments_report_id_fkey: FOREIGN KEY (report_id) REFERENCES public_reports(id) ON DELETE RESTRICT
report_attachments_storage_path_key: UNIQUE (storage_path)
CREATE UNIQUE INDEX report_attachments_pkey ON public.report_attachments USING btree (id)
CREATE UNIQUE INDEX report_attachments_storage_path_key ON public.report_attachments USING btree (storage_path)
CREATE INDEX idx_report_attachments ON public.report_attachments USING btree (report_id)
```

### report_status_history

```text
id uuid NOT NULL
report_id uuid NOT NULL
from_status text NULL
to_status text NOT NULL
changed_by uuid NULL
reason text NULL
changed_at timestamp with time zone NOT NULL
report_status_history_changed_by_fkey: FOREIGN KEY (changed_by) REFERENCES staff_profiles(user_id) ON DELETE SET NULL
report_status_history_from_status_check: CHECK (from_status IS NULL OR (from_status = ANY (ARRAY['unverified'::text, 'under_review'::text, 'verified'::text, 'rejected'::text])))
report_status_history_pkey: PRIMARY KEY (id)
report_status_history_report_id_fkey: FOREIGN KEY (report_id) REFERENCES public_reports(id) ON DELETE RESTRICT
report_status_history_to_status_check: CHECK (to_status = ANY (ARRAY['unverified'::text, 'under_review'::text, 'verified'::text, 'rejected'::text]))
CREATE UNIQUE INDEX report_status_history_pkey ON public.report_status_history USING btree (id)
CREATE INDEX idx_report_history ON public.report_status_history USING btree (report_id, changed_at DESC)
```

### roles

```text
id uuid NOT NULL
code text NOT NULL
name text NOT NULL
description text NULL
roles_code_check: CHECK (code = ANY (ARRAY['super_admin'::text, 'information_manager'::text, 'report_verifier'::text, 'mitigation_editor'::text]))
roles_code_key: UNIQUE (code)
roles_pkey: PRIMARY KEY (id)
CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id)
CREATE UNIQUE INDEX roles_code_key ON public.roles USING btree (code)
```

### source_sync_logs

```text
id uuid NOT NULL
source_id uuid NOT NULL
sync_status text NOT NULL
records_processed integer NOT NULL
error_message text NULL
started_at timestamp with time zone NOT NULL
finished_at timestamp with time zone NULL
source_sync_logs_check: CHECK (finished_at IS NULL OR finished_at >= started_at)
source_sync_logs_pkey: PRIMARY KEY (id)
source_sync_logs_records_processed_check: CHECK (records_processed >= 0)
source_sync_logs_source_id_fkey: FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE RESTRICT
source_sync_logs_sync_status_check: CHECK (sync_status = ANY (ARRAY['success'::text, 'partial'::text, 'failed'::text]))
CREATE UNIQUE INDEX source_sync_logs_pkey ON public.source_sync_logs USING btree (id)
CREATE INDEX idx_sync_source_time ON public.source_sync_logs USING btree (source_id, started_at DESC)
```

### staff_profiles

```text
user_id uuid NOT NULL
display_name text NOT NULL
is_active boolean NOT NULL
created_at timestamp with time zone NOT NULL
staff_profiles_pkey: PRIMARY KEY (user_id)
staff_profiles_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
CREATE UNIQUE INDEX staff_profiles_pkey ON public.staff_profiles USING btree (user_id)
```

### staff_role_assignments

```text
staff_id uuid NOT NULL
role_id uuid NOT NULL
assigned_at timestamp with time zone NOT NULL
staff_role_assignments_pkey: PRIMARY KEY (staff_id, role_id)
staff_role_assignments_role_id_fkey: FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
staff_role_assignments_staff_id_fkey: FOREIGN KEY (staff_id) REFERENCES staff_profiles(user_id) ON DELETE CASCADE
CREATE UNIQUE INDEX staff_role_assignments_pkey ON public.staff_role_assignments USING btree (staff_id, role_id)
```

## Seluruh policies

Semua PERMISSIVE; kombinasi policy dapat memberi akses melalui OR.

### articles.articles_public_read

```text
TO anon, authenticated FOR SELECT
USING ((publication_status = 'published'::text) AND (published_at IS NOT NULL))
WITH CHECK (none)
```

### articles.articles_staff_all

```text
TO authenticated FOR ALL
USING has_staff_role(ARRAY['super_admin'::text, 'information_manager'::text])
WITH CHECK has_staff_role(ARRAY['super_admin'::text, 'information_manager'::text])
```

### data_sources.sources_public_read

```text
TO anon, authenticated FOR SELECT
USING is_active
WITH CHECK (none)
```

### disaster_events.events_public_read

```text
TO anon, authenticated FOR SELECT
USING ((published_at IS NOT NULL) AND (verification_status <> 'unconfirmed'::text))
WITH CHECK (none)
```

### disaster_events.events_staff_all

```text
TO authenticated FOR ALL
USING has_staff_role(ARRAY['super_admin'::text, 'information_manager'::text])
WITH CHECK has_staff_role(ARRAY['super_admin'::text, 'information_manager'::text])
```

### donation_campaigns.donations_public_read

```text
TO anon, authenticated FOR SELECT
USING (is_active AND is_simulation)
WITH CHECK (none)
```

### donation_campaigns.donations_staff_all

```text
TO authenticated FOR ALL
USING has_staff_role(ARRAY['super_admin'::text, 'information_manager'::text])
WITH CHECK has_staff_role(ARRAY['super_admin'::text, 'information_manager'::text])
```

### emergency_contacts.emergency_public_read

```text
TO anon, authenticated FOR SELECT
USING (is_verified AND is_active)
WITH CHECK (none)
```

### emergency_contacts.emergency_staff_all

```text
TO authenticated FOR ALL
USING has_staff_role(ARRAY['super_admin'::text, 'information_manager'::text])
WITH CHECK has_staff_role(ARRAY['super_admin'::text, 'information_manager'::text])
```

### event_locations.event_locations_public_read

```text
TO anon, authenticated FOR SELECT
USING (EXISTS ( SELECT 1
   FROM disaster_events e
  WHERE ((e.id = event_locations.event_id) AND (e.published_at IS NOT NULL) AND (e.verification_status <> 'unconfirmed'::text))))
WITH CHECK (none)
```

### event_locations.locations_staff_all

```text
TO authenticated FOR ALL
USING has_staff_role(ARRAY['super_admin'::text, 'information_manager'::text])
WITH CHECK has_staff_role(ARRAY['super_admin'::text, 'information_manager'::text])
```

### event_updates.event_updates_public_read

```text
TO anon, authenticated FOR SELECT
USING (EXISTS ( SELECT 1
   FROM disaster_events e
  WHERE ((e.id = event_updates.event_id) AND (e.published_at IS NOT NULL) AND (e.verification_status <> 'unconfirmed'::text))))
WITH CHECK (none)
```

### event_updates.updates_staff_all

```text
TO authenticated FOR ALL
USING has_staff_role(ARRAY['super_admin'::text, 'information_manager'::text])
WITH CHECK has_staff_role(ARRAY['super_admin'::text, 'information_manager'::text])
```

### mitigation_checklist_items.checklist_public_read

```text
TO anon, authenticated FOR SELECT
USING (is_active AND (EXISTS ( SELECT 1
   FROM mitigation_guides g
  WHERE ((g.id = mitigation_checklist_items.guide_id) AND (g.publication_status = 'published'::text)))))
WITH CHECK (none)
```

### mitigation_checklist_items.checklist_staff_all

```text
TO authenticated FOR ALL
USING has_staff_role(ARRAY['super_admin'::text, 'mitigation_editor'::text])
WITH CHECK has_staff_role(ARRAY['super_admin'::text, 'mitigation_editor'::text])
```

### mitigation_guides.guides_public_read

```text
TO anon, authenticated FOR SELECT
USING (publication_status = 'published'::text)
WITH CHECK (none)
```

### mitigation_guides.guides_staff_all

```text
TO authenticated FOR ALL
USING has_staff_role(ARRAY['super_admin'::text, 'mitigation_editor'::text])
WITH CHECK has_staff_role(ARRAY['super_admin'::text, 'mitigation_editor'::text])
```

### public_reports.reports_staff_read

```text
TO authenticated FOR SELECT
USING has_staff_role(ARRAY['super_admin'::text, 'report_verifier'::text])
WITH CHECK (none)
```

### regions.regions_public_read

```text
TO anon, authenticated FOR SELECT
USING true
WITH CHECK (none)
```

### relief_locations.relief_public_read

```text
TO anon, authenticated FOR SELECT
USING (verification_status = 'verified'::text)
WITH CHECK (none)
```

### relief_locations.relief_staff_all

```text
TO authenticated FOR ALL
USING has_staff_role(ARRAY['super_admin'::text, 'information_manager'::text])
WITH CHECK has_staff_role(ARRAY['super_admin'::text, 'information_manager'::text])
```

### report_attachments.attachments_staff_read

```text
TO authenticated FOR SELECT
USING has_staff_role(ARRAY['super_admin'::text, 'report_verifier'::text])
WITH CHECK (none)
```

### report_status_history.report_history_staff_read

```text
TO authenticated FOR SELECT
USING has_staff_role(ARRAY['super_admin'::text, 'report_verifier'::text])
WITH CHECK (none)
```

### roles.roles_staff_read

```text
TO authenticated FOR SELECT
USING has_staff_role(ARRAY['super_admin'::text])
WITH CHECK (none)
```

### staff_profiles.staff_profiles_read

```text
TO authenticated FOR SELECT
USING ((user_id = ( SELECT auth.uid() AS uid)) OR has_staff_role(ARRAY['super_admin'::text]))
WITH CHECK (none)
```

### staff_role_assignments.assignment_staff_read

```text
TO authenticated FOR SELECT
USING ((staff_id = ( SELECT auth.uid() AS uid)) OR has_staff_role(ARRAY['super_admin'::text]))
WITH CHECK (none)
```

## Seluruh functions

Metadata tidak berisi function bodies; fingerprint bukan bukti validasi identitas/role/token.

| Fungsi | Owner | Definer | search_path | anon EXECUTE | authenticated EXECUTE |
| --- | --- | --- | --- | --- | --- |
| auth.uid() | supabase_auth_admin | false | (unset) | true | true |
| pgbouncer.get_auth(p_usename text) | supabase_admin | true | search_path="" | false | false |
| public.has_staff_role(p_codes text[]) | postgres | true | search_path="" | true | true |
| public.review_public_report(p_report_id uuid, p_new_status text, p_reason text) | postgres | true | search_path="" | true | true |
| public.set_updated_at() | postgres | false | search_path="" | true | true |
| public.submit_public_report(p_report_type text, p_title text, p_description text, p_region_id uuid, p_location_description text, p_latitude double precision, p_longitude double precision) | postgres | true | search_path="" | true | true |
| public.track_public_report(p_tracking_code text, p_access_token text) | postgres | true | search_path="" | true | true |

## Scope dan batas

26 relasi seluruhnya public ordinary tables; tidak ada view/materialized view atau sequence dalam snapshot. Scope schema memuat public dan pgbouncer. pgbouncer bukan modul RekanSiaga; get_auth tidak mendapat USAGE/EXECUTE client. auth.uid adalah fungsi managed invoker, bukan temuan search_path definer. Enam trigger aplikasi enabled O memanggil public.set_updated_at sebagai invoker.

77 policy dependencies diperiksa: public-read child policies menuju parent events/guides; policy staf menuju has_staff_role; profil/assignment juga auth.uid. Tidak ada siklus tabel langsung pada ekspresi yang ditampilkan; body helper/dynamic SQL belum tersedia sehingga bebas rekursi belum dibuktikan. Managed schemas, auth triggers, Data API exposure, storage policies, default values, function result types dan row data tidak tersedia lengkap. RLS forced=false bukan otomatis kelemahan; jalur owner SECURITY DEFINER tetap perlu body review.
