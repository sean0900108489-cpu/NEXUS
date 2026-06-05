CREATE OR REPLACE FUNCTION public.record_permission_audit_log(
  p_workspace_id text,
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_decision text DEFAULT 'denied',
  p_reason_code text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  safe_metadata jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.'
      USING ERRCODE = '28000';
  END IF;

  IF p_workspace_id IS NOT NULL
    AND NOT public.is_workspace_member(p_workspace_id)
  THEN
    RAISE EXCEPTION 'Workspace membership is required.'
      USING ERRCODE = '42501';
  END IF;

  IF p_decision NOT IN ('allowed', 'denied', 'requires_confirmation') THEN
    RAISE EXCEPTION 'Invalid permission audit decision.'
      USING ERRCODE = '22023';
  END IF;

  safe_metadata := COALESCE(p_metadata, '{}'::jsonb);

  IF octet_length(safe_metadata::text) > 8192 THEN
    safe_metadata := jsonb_build_object(
      'truncated', true,
      'originalByteLength', octet_length(COALESCE(p_metadata, '{}'::jsonb)::text)
    );
  END IF;

  INSERT INTO public.permission_audit_logs (
    workspace_id,
    actor_user_id,
    action,
    resource_type,
    resource_id,
    decision,
    reason_code,
    metadata
  )
  VALUES (
    NULLIF(btrim(p_workspace_id), ''),
    auth.uid(),
    left(NULLIF(btrim(p_action), ''), 160),
    left(NULLIF(btrim(p_resource_type), ''), 120),
    left(NULLIF(btrim(p_resource_id), ''), 180),
    p_decision,
    left(NULLIF(btrim(p_reason_code), ''), 120),
    safe_metadata
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_permission_audit_log(
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_permission_audit_log(
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) TO authenticated, service_role;
