-- Create workflow template table for reusable graph blueprints.
CREATE TABLE IF NOT EXISTS public.workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    blueprint_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Development-only policy: public anon read/write access.
ALTER TABLE public.workflow_templates DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.workflow_templates TO anon;
