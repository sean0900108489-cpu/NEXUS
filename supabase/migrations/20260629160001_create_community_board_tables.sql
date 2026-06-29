CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NULL,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NULL,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'deleted')),
  reply_count INTEGER NOT NULL DEFAULT 0 CHECK (reply_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created_at
  ON public.community_posts (created_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_community_posts_author
  ON public.community_posts (author_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_replies_post_created_at
  ON public.community_replies (post_id, created_at ASC)
  WHERE status = 'published';

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_replies ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.community_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.community_replies TO authenticated;

DROP POLICY IF EXISTS "community_posts_authenticated_read_published"
  ON public.community_posts;
CREATE POLICY "community_posts_authenticated_read_published"
  ON public.community_posts
  FOR SELECT
  TO authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "community_posts_authenticated_insert_own"
  ON public.community_posts;
CREATE POLICY "community_posts_authenticated_insert_own"
  ON public.community_posts
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = author_user_id);

DROP POLICY IF EXISTS "community_posts_author_update_own"
  ON public.community_posts;
CREATE POLICY "community_posts_author_update_own"
  ON public.community_posts
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = author_user_id)
  WITH CHECK ((SELECT auth.uid()) = author_user_id);

DROP POLICY IF EXISTS "community_replies_authenticated_read_published"
  ON public.community_replies;
CREATE POLICY "community_replies_authenticated_read_published"
  ON public.community_replies
  FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1
      FROM public.community_posts
      WHERE community_posts.id = community_replies.post_id
        AND community_posts.status = 'published'
    )
  );

DROP POLICY IF EXISTS "community_replies_authenticated_insert_own"
  ON public.community_replies;
CREATE POLICY "community_replies_authenticated_insert_own"
  ON public.community_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = author_user_id
    AND EXISTS (
      SELECT 1
      FROM public.community_posts
      WHERE community_posts.id = community_replies.post_id
        AND community_posts.status = 'published'
    )
  );

DROP POLICY IF EXISTS "community_replies_author_update_own"
  ON public.community_replies;
CREATE POLICY "community_replies_author_update_own"
  ON public.community_replies
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = author_user_id)
  WITH CHECK ((SELECT auth.uid()) = author_user_id);

COMMENT ON TABLE public.community_posts IS
  'R6 standalone Community Board posts shared across authenticated NEXUS users.';

COMMENT ON TABLE public.community_replies IS
  'R6 standalone Community Board replies shared across authenticated NEXUS users.';
