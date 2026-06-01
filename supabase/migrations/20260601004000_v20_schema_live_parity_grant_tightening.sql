-- V20 schema live parity grant tightening.
--
-- Follow-up to the additive parity repair: Supabase may grant broad default
-- table privileges when a table is created. Revoke those broad client grants
-- and re-apply only the DML privileges intentionally exposed through RLS.

REVOKE ALL PRIVILEGES ON TABLE public.feature_flags FROM anon, authenticated, PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.deployment_checks FROM anon, authenticated, PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.agent_memory_records FROM anon, authenticated, PUBLIC;

GRANT SELECT, INSERT, UPDATE ON TABLE public.feature_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agent_memory_records TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.feature_flags TO service_role;
GRANT SELECT, INSERT ON TABLE public.deployment_checks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agent_memory_records TO service_role;

COMMENT ON SCHEMA public IS
  'V20 schema parity: protected public tables keep anon grants revoked; authenticated grants are limited to client-facing DML and server-only tables stay service-role only.';
