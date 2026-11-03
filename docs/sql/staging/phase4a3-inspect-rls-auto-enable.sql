-- READ ONLY. NOT EXECUTED BY CODEX. Verify staging Dashboard project reference.
-- Returns code/metadata, never calls rls_auto_enable() or creates probe objects.
-- Review definitions privately for embedded secrets before sharing the JSON.
-- Hashes identify a snapshot; they do NOT establish safe function behavior.
BEGIN TRANSACTION READ ONLY;
WITH candidates AS (
 SELECT p.*,n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='rls_auto_enable'
), graph AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
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
  ) ORDER BY e.evtname),'[]'::jsonb) AS event_graph
 FROM pg_event_trigger e JOIN pg_proc p ON p.oid=e.evtfoid
 JOIN pg_namespace n ON n.oid=p.pronamespace
)
SELECT jsonb_build_object(
 'kind','READ_ONLY_EXISTING_EVENT_TRIGGER_REVIEW_NOT_BEHAVIOR_PASS',
 'captured_at',CURRENT_TIMESTAMP,'executing_role',current_user,
 'database_name',current_database(),'server_version',current_setting('server_version'),
 'session_replication_role',current_setting('session_replication_role'),
 'public_relation_objects',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')),
'public_routines', (
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'oid', p.oid,
                'name', p.proname,
                'kind', p.prokind,
                'signature', pg_get_function_identity_arguments(p.oid),
                'return_type', pg_get_function_result(p.oid),
                'owner', pg_get_userbyid(p.proowner)
            )
            ORDER BY p.proname, p.oid
        ),
        '[]'::jsonb
    )
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
),
 'candidate_definitions',(SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'oid',p.oid,'schema',p.nspname,'name',p.proname,'kind',p.prokind,
   'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
   'input_count',p.pronargs,'all_argtypes',p.proallargtypes,'arg_modes',p.proargmodes,
   'variadic_type',p.provariadic,'set_returning',p.proretset,
   'signature',pg_get_function_identity_arguments(p.oid),
   'return_type',pg_get_function_result(p.oid),'security_definer',p.prosecdef,
   'config',p.proconfig,'acl',p.proacl::text,
   'definition',CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END,
   'definition_md5',CASE WHEN p.prokind='f' THEN md5(pg_get_functiondef(p.oid)) END,
   'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
   'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
   'extension_membership',(SELECT COALESCE(jsonb_agg(jsonb_build_object(
     'extension',e.extname,'dependency_type',d.deptype)),'[]'::jsonb)
     FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid
     WHERE d.classid='pg_catalog.pg_proc'::regclass AND d.objid=p.oid
      AND d.refclassid='pg_catalog.pg_extension'::regclass AND d.deptype IN ('e','x')),
   'all_outgoing_dependencies',(SELECT COALESCE(jsonb_agg(jsonb_build_object(
     'type',d.deptype,'reference',pg_describe_object(d.refclassid,d.refobjid,d.refobjsubid))
     ORDER BY d.refclassid,d.refobjid,d.refobjsubid,d.deptype),'[]'::jsonb)
     FROM pg_depend d WHERE d.classid='pg_catalog.pg_proc'::regclass AND d.objid=p.oid),
   'incoming_dependents',(SELECT COALESCE(jsonb_agg(jsonb_build_object(
     'type',d.deptype,'dependent',pg_describe_object(d.classid,d.objid,d.objsubid))
     ORDER BY d.classid,d.objid,d.objsubid,d.deptype),'[]'::jsonb)
     FROM pg_depend d WHERE d.refclassid='pg_catalog.pg_proc'::regclass AND d.refobjid=p.oid)
  ) ORDER BY p.oid),'[]'::jsonb) FROM candidates p JOIN pg_language l ON l.oid=p.prolang),
 'event_graph',(SELECT event_graph FROM graph),
 'event_graph_md5',(SELECT md5(event_graph::text) FROM graph),
 'event_function_definitions',(SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'event',e.evtname,'function_oid',p.oid,'definition',pg_get_functiondef(p.oid))
   ORDER BY e.evtname),'[]'::jsonb)
   FROM pg_event_trigger e JOIN pg_proc p ON p.oid=e.evtfoid),
 'extension_event_memberships',(SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'event',e.evtname,'extension',x.extname,'dependency_type',d.deptype)),'[]'::jsonb)
   FROM pg_event_trigger e JOIN pg_depend d ON d.classid='pg_catalog.pg_event_trigger'::regclass AND d.objid=e.oid
   JOIN pg_extension x ON d.refclassid='pg_catalog.pg_extension'::regclass AND x.oid=d.refobjid
   WHERE d.deptype IN ('e','x')),
 'note','User-reported metadata is partial. Return type/event owner/tags/ACL/config/dependencies and bodies require review before acknowledgement. Extension absence is not provider provenance.'
) AS phase4a3_existing_event_trigger_review;
ROLLBACK;
