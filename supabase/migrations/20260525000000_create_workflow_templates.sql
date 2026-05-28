-- Create workflow template table for reusable graph blueprints.
CREATE TABLE IF NOT EXISTS public.workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    blueprint_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Production-safe default: keep the table protected until the workspace-aware
-- policies in the security boundary migration are applied.
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.workflow_templates FROM anon;
