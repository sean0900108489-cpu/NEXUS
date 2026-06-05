-- R104 viewer-readable workspace session repair.
--
-- Existing previews may not have service-role access. This SECURITY DEFINER
-- function is therefore the authenticated fallback used by
-- /api/v1/workspaces/session. Viewer memberships must resolve to their shared
-- workspace for read-only inspection instead of creating an unrelated owner
-- workspace.

CREATE OR REPLACE FUNCTION public.nexus_ensure_workspace_session(
  p_preferred_workspace_id TEXT DEFAULT NULL,
  p_preferred_workspace_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  workspace_id TEXT,
  workspace_name TEXT,
  role TEXT,
  created BOOLEAN,
  reason TEXT,
  preferred_workspace_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  actor_user_id UUID := auth.uid();
  normalized_preferred_workspace_id TEXT := NULLIF(BTRIM(p_preferred_workspace_id), '');
  normalized_workspace_name TEXT := COALESCE(NULLIF(BTRIM(p_preferred_workspace_name), ''), 'NEXUS // AI OPS');
  selected_workspace_id TEXT;
  selected_workspace_name TEXT;
  selected_role TEXT;
  created_workspace_id TEXT;
BEGIN
  IF actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.'
      USING ERRCODE = '42501';
  END IF;

  IF normalized_preferred_workspace_id IS NOT NULL
    AND NOT (
      normalized_preferred_workspace_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      OR normalized_preferred_workspace_id ~ '^workspace[-_][A-Za-z0-9_-]{3,96}$'
    )
  THEN
    normalized_preferred_workspace_id := NULL;
  END IF;

  IF normalized_preferred_workspace_id IS NOT NULL THEN
    SELECT
      wm.workspace_id,
      COALESCE(w.name, normalized_workspace_name),
      wm.role
    INTO selected_workspace_id, selected_workspace_name, selected_role
    FROM public.workspace_memberships AS wm
    LEFT JOIN public.workspaces AS w
      ON w.id = wm.workspace_id
    WHERE wm.workspace_id = normalized_preferred_workspace_id
      AND wm.user_id = actor_user_id
      AND wm.role IN ('owner', 'admin', 'editor', 'viewer')
    ORDER BY wm.updated_at DESC
    LIMIT 1;

    IF selected_workspace_id IS NOT NULL THEN
      RETURN QUERY SELECT
        selected_workspace_id,
        selected_workspace_name,
        selected_role,
        FALSE,
        'preferred_workspace_member',
        normalized_preferred_workspace_id;
      RETURN;
    END IF;
  END IF;

  SELECT
    wm.workspace_id,
    COALESCE(w.name, normalized_workspace_name),
    wm.role
  INTO selected_workspace_id, selected_workspace_name, selected_role
  FROM public.workspace_memberships AS wm
  LEFT JOIN public.workspaces AS w
    ON w.id = wm.workspace_id
  WHERE wm.user_id = actor_user_id
    AND wm.role IN ('owner', 'admin', 'editor')
  ORDER BY wm.updated_at DESC
  LIMIT 1;

  IF selected_workspace_id IS NOT NULL THEN
    RETURN QUERY SELECT
      selected_workspace_id,
      selected_workspace_name,
      selected_role,
      FALSE,
      'existing_writable_workspace',
      normalized_preferred_workspace_id;
    RETURN;
  END IF;

  SELECT
    wm.workspace_id,
    COALESCE(w.name, normalized_workspace_name),
    wm.role
  INTO selected_workspace_id, selected_workspace_name, selected_role
  FROM public.workspace_memberships AS wm
  LEFT JOIN public.workspaces AS w
    ON w.id = wm.workspace_id
  WHERE wm.user_id = actor_user_id
    AND wm.role = 'viewer'
  ORDER BY wm.updated_at DESC
  LIMIT 1;

  IF selected_workspace_id IS NOT NULL THEN
    RETURN QUERY SELECT
      selected_workspace_id,
      selected_workspace_name,
      selected_role,
      FALSE,
      'existing_readable_workspace',
      normalized_preferred_workspace_id;
    RETURN;
  END IF;

  created_workspace_id := 'workspace_' || REPLACE(gen_random_uuid()::TEXT, '-', '');

  INSERT INTO public.workspaces (
    id,
    name,
    owner_user_id,
    created_by,
    updated_at
  )
  VALUES (
    created_workspace_id,
    normalized_workspace_name,
    actor_user_id,
    actor_user_id,
    NOW()
  );

  INSERT INTO public.workspace_memberships (
    workspace_id,
    user_id,
    role
  )
  VALUES (
    created_workspace_id,
    actor_user_id,
    'owner'
  )
  ON CONFLICT ON CONSTRAINT workspace_memberships_workspace_user_unique
  DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();

  RETURN QUERY SELECT
    created_workspace_id,
    normalized_workspace_name,
    'owner'::TEXT,
    TRUE,
    'created_user_workspace',
    normalized_preferred_workspace_id;
END;
$$;

REVOKE ALL ON FUNCTION public.nexus_ensure_workspace_session(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nexus_ensure_workspace_session(TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.nexus_ensure_workspace_session(TEXT, TEXT)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.nexus_ensure_workspace_session(TEXT, TEXT) IS
  'R104 authenticated workspace session bootstrap. Preferred viewer memberships resolve as read-only sessions instead of creating unrelated owner workspaces.';
