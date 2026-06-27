# NEXUS Window OS — Data Contracts & Migration Readiness

> Phase 4B — Design document. No destructive migrations are executed.
> All tables and APIs are **proposed contracts** for future implementation.

---

## 1. Current State: localStorage MVP

### 1.1 Notes

| Key | Value |
|-----|-------|
| `nexus-notes:v2:index` | `string[]` — note IDs, newest first |
| `nexus-notes:v2:note:{id}` | `NexusNote` — `{ id, title, content, linkedResources[], createdAt, updatedAt }` |

```
NexusNote {
  id: "note_lx..."          // client-generated ID
  title: "Untitled Note"
  content: ""
  linkedResources: [{
    type: "attachment",
    id: "att-123",
    label: "screenshot.png",
    meta?: { kind, mimeType }
  }]
  createdAt: "2026-06-27T..."
  updatedAt: "2026-06-27T..."
}
```

### 1.2 Forum

| Key | Value |
|-----|-------|
| `nexus-forum:v1:threads-index` | `string[]` — thread IDs |
| `nexus-forum:v1:thread:{id}` | `ForumThread` |
| `nexus-forum:v1:replies:{threadId}` | `ForumReply[]` |

```
ForumThread {
  id: "thread_lx..."
  title, body
  attachments: NexusResourceRef[]
  createdAt, updatedAt
  replyCount: number
  authorLabel?: string
  author?: NexusAuthorRef
}

ForumReply {
  id: "reply_lx..."
  threadId
  body
  attachments: NexusResourceRef[]
  createdAt, updatedAt
  authorLabel?: string
  author?: NexusAuthorRef
}
```

### 1.3 Feed & Interactions

> Phase 5B local primitive only. No DB migration is executed.

| Key | Value |
|-----|-------|
| `nexus-feed:v1:items` | `NexusFeedItem[]` — local feed items, newest first |
| `nexus-interactions:v1:{targetType}:{targetId}` | local viewer interaction snapshot |

```
NexusFeedItem {
  id: "feed_lx..."
  title?: string
  body: string
  author?: NexusAuthorRef
  attachments?: NexusResourceRef[]
  linkedResources?: NexusResourceRef[]
  counts?: NexusInteractionCounts
  createdAt: "2026-06-27T..."
  updatedAt?: "2026-06-27T..."
  source?: { type: "manual" | "forum" | "chat" | "note" | "marketplace"; id?: string }
}

NexusInteractionTarget {
  type: "feed-item" | "forum-thread" | "forum-reply" | "note" | "artifact" | "marketplace-task"
  id: string
}

NexusInteractionCounts {
  comments?: number
  reactions?: { like?: number; upvote?: number; bookmark?: number }
  saves?: number
}
```

The local interaction API is viewer-state only. It is not a durable reactions
backend, comment backend, follow graph, ranking system, or marketplace backend.

### 1.4 Resource Reference Contract

```typescript
type NexusResourceRef = {
  type: "attachment" | "artifact" | "global-conversation" | "workspace"
      | "note" | "profile" | "forum-post" | "marketplace-listing";
  id: string;           // Canonical resource ID
  label?: string;       // Display name
  meta?: Record<string, unknown>;  // Extra context
};
```

### 1.5 Attachment / Artifact Contract (existing, reused)

- Storage: `user-attachments` Supabase bucket
- DB: `user_attachments` table
- API: `POST /api/attachments`, `GET /api/attachments/[id]`, `GET /api/attachments?query=...`
- Signed URLs: ephemeral, 1-hour TTL, canonical identity = attachment ID

---

## 2. Proposed Supabase Tables

### 2.1 User Profiles (`user_profiles`)

> Phase 5A does not execute this migration. Current profile primitives use
> auth metadata and local fallback profiles until a durable profile table is
> introduced.

```sql
CREATE TABLE user_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL UNIQUE REFERENCES auth.users(id),
  display_name  text NOT NULL,
  handle        text UNIQUE,
  avatar_url    text,
  bio           text,
  role_label    text,
  meta          jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX idx_user_profiles_user ON user_profiles(user_id, deleted_at);
CREATE INDEX idx_user_profiles_handle ON user_profiles(handle)
  WHERE handle IS NOT NULL AND deleted_at IS NULL;
```

**RLS contract (future):**
```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Public apps may read basic profile fields.
CREATE POLICY "Anyone can read basic profiles"
  ON user_profiles FOR SELECT
  USING (deleted_at IS NULL);

-- Owners can manage their own profile row.
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**Privacy rule:** Do not store private auth, billing, wallet, or contact fields
in `user_profiles`. Keep it to public identity display fields.

### 2.2 Notes (`user_notes`)

> Decision: NOT reusing existing `notebooks` table. Notebooks is workspace-scoped
> with complex permission logic. `user_notes` is account-first, simpler.

```sql
CREATE TABLE user_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id),
  workspace_id  uuid REFERENCES workspaces(id),
  title         text NOT NULL DEFAULT 'Untitled Note',
  content       text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX idx_user_notes_user ON user_notes(user_id, deleted_at);
CREATE INDEX idx_user_notes_workspace ON user_notes(workspace_id) WHERE workspace_id IS NOT NULL;
```

**RLS contract (future):**
```sql
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own notes"
  ON user_notes FOR ALL
  USING (user_id = auth.uid());
-- Workspace notes readable by members:
CREATE POLICY "Workspace members can read workspace notes"
  ON user_notes FOR SELECT
  USING (workspace_id IS NOT NULL AND is_workspace_member(workspace_id));
```

### 2.3 Note Resources (`note_resources`)

> Pattern follows existing `artifact_references` table design.

```sql
CREATE TABLE note_resources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id       uuid NOT NULL REFERENCES user_notes(id) ON DELETE CASCADE,
  resource_type text NOT NULL,   -- e.g. "attachment", "artifact"
  resource_id   text NOT NULL,   -- Canonical resource ID
  label         text,
  meta          jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(note_id, resource_type, resource_id)  -- dedup
);

CREATE INDEX idx_nr_note ON note_resources(note_id);
```

**RLS:** Same as `user_notes` — derived from parent note ownership.

### 2.4 Forum Threads (`forum_threads`)

```sql
CREATE TABLE forum_threads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id),
  workspace_id  uuid REFERENCES workspaces(id),
  title         text NOT NULL,
  body          text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'published',  -- published | closed | archived
  reply_count   integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX idx_ft_user ON forum_threads(user_id, deleted_at);
CREATE INDEX idx_ft_status ON forum_threads(status) WHERE status = 'published';
```

### 2.5 Forum Replies (`forum_replies`)

```sql
CREATE TABLE forum_replies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id     uuid NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id),
  body          text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX idx_fr_thread ON forum_replies(thread_id, deleted_at);
```

### 2.6 Forum Post Resources (`forum_post_resources`)

> Unified resource table for both threads and replies.

```sql
CREATE TABLE forum_post_resources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_type     text NOT NULL,   -- "thread" | "reply"
  post_id       uuid NOT NULL,
  resource_type text NOT NULL,
  resource_id   text NOT NULL,
  label         text,
  meta          jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_type, post_id, resource_type, resource_id)
);

CREATE INDEX idx_fpr_post ON forum_post_resources(post_type, post_id);
```

**RLS contract (future):**
```sql
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

-- Published threads readable by anyone
CREATE POLICY "Anyone can read published threads"
  ON forum_threads FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL);

-- Users can CRUD own threads
CREATE POLICY "Users can CRUD own threads"
  ON forum_threads FOR ALL
  USING (user_id = auth.uid());
```

### 2.7 Marketplace (future contract)

```sql
CREATE TABLE marketplace_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id),   -- poster
  title         text NOT NULL,
  description   text NOT NULL DEFAULT '',
  budget_credits integer,
  status        text NOT NULL DEFAULT 'open',  -- open | assigned | completed | cancelled
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE TABLE marketplace_offers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       uuid NOT NULL REFERENCES marketplace_tasks(id),
  user_id       uuid NOT NULL REFERENCES auth.users(id),   -- offerer
  message       text,
  price_credits integer,
  status        text NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE marketplace_task_resources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       uuid NOT NULL REFERENCES marketplace_tasks(id),
  resource_type text NOT NULL,
  resource_id   text NOT NULL,
  label         text,
  meta          jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

> Notes:
> - Task attachments reuse Resource Ref / `user_attachments`
> - Task discussion can reference Forum thread model (or embed lightweight chat)
> - Reviews/ratings deferred to post-MVP

### 2.8 Feed & Interactions (future contract)

> Phase 5B does not execute this migration. These tables are future contracts
> for a durable feed backend after the primitive has proven useful locally.

```sql
CREATE TABLE feed_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id),
  workspace_id  uuid REFERENCES workspaces(id),
  title         text,
  body          text NOT NULL DEFAULT '',
  source_type   text NOT NULL DEFAULT 'manual',
  source_id     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX idx_feed_items_user ON feed_items(user_id, deleted_at);
CREATE INDEX idx_feed_items_created ON feed_items(created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE feed_item_resources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id  uuid NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  resource_id   text NOT NULL,
  label         text,
  meta          jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(feed_item_id, resource_type, resource_id)
);
```

Durable `interaction_events` / aggregate counts are intentionally deferred
until product semantics are known. A Reddit-like app, Instagram-like app, and
Marketplace-like app may need different reaction kinds, visibility rules,
anti-abuse constraints, and aggregation windows.

---

## 3. API Route Contracts

### 3.1 Notes API

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/notes` | List user's notes. Query: `?workspaceId=&query=&limit=&cursor=` |
| `POST` | `/api/notes` | Create note. Body: `{ title?, content?, workspaceId? }` |
| `GET` | `/api/notes/[id]` | Get note with linked resources |
| `PATCH` | `/api/notes/[id]` | Update note. Body: `{ title?, content? }` |
| `DELETE` | `/api/notes/[id]` | Soft-delete note |
| `POST` | `/api/notes/[id]/resources` | Add resource ref. Body: `{ type, id, label?, meta? }` |
| `DELETE` | `/api/notes/[id]/resources` | Remove resource ref. Body: `{ resourceType, resourceId }` |

**Auth:** Bearer token via `resolveApiActor`
**Response envelope:** `{ note: NexusNote }` or `{ notes: NexusNote[], nextCursor?, hasMore }`

### 3.2 Forum API

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/forum/threads` | List threads. Query: `?status=published&limit=&cursor=` |
| `POST` | `/api/forum/threads` | Create thread. Body: `{ title, body, attachments?, workspaceId? }` |
| `GET` | `/api/forum/threads/[id]` | Get thread + replies |
| `PATCH` | `/api/forum/threads/[id]` | Update thread |
| `DELETE` | `/api/forum/threads/[id]` | Soft-delete thread |
| `POST` | `/api/forum/threads/[id]/replies` | Create reply. Body: `{ body, attachments? }` |
| `PATCH` | `/api/forum/replies/[id]` | Update reply |
| `DELETE` | `/api/forum/replies/[id]` | Soft-delete reply |
| `POST` | `/api/forum/posts/[type]/[id]/resources` | Add resource ref |

### 3.3 Marketplace API (future)

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/marketplace/tasks` | List tasks |
| `POST` | `/api/marketplace/tasks` | Create task |
| `GET` | `/api/marketplace/tasks/[id]` | Get task + offers |
| `POST` | `/api/marketplace/tasks/[id]/offers` | Submit offer |
| `PATCH` | `/api/marketplace/offers/[id]` | Accept/reject offer |

---

## 4. RLS / Ownership Model

### 4.1 Principles

1. **Account-level resources** (`user_notes` without workspace): owner-only by default
2. **Workspace-level resources**: workspace members can read; editors+ can write
3. **Published forum threads**: readable by all authenticated users
4. **Own forum threads/replies**: CRUD by owner only
5. **Soft delete**: `deleted_at` pattern, never hard-delete from API

### 4.2 RLS Helper Functions (already exist)

```sql
-- Already in Supabase:
has_workspace_role(target_workspace_id, allowed_roles[]) → boolean
is_workspace_member(target_workspace_id) → boolean
```

### 4.3 Future RLS Policies (NOT executed)

```sql
-- Notes: owner-only for account notes; workspace members for workspace notes
-- Forum: public-read for published; owner-write for own
-- Marketplace: poster-write; authenticated-read for open tasks
```

---

## 5. LocalStorage → Supabase Migration Path

### 5.1 Export

```typescript
// Future: added to notes-api.ts / forum-api.ts
notesApi.exportAll(): { version: 1, exportedAt: string, notes: NexusNote[] }
forumApi.exportAll(): { version: 1, exportedAt: string, threads: ForumThread[], repliesByThread: Record<string, ForumReply[]> }
```

### 5.2 Import

```typescript
// Future Supabase implementation
async function migrateLocalNotesToSupabase(): Promise<MigrationReport> {
  // 1. Export all local notes
  // 2. POST each note to /api/notes
  // 3. For each linkedResource: POST /api/notes/[newId]/resources
  // 4. On success: mark local note as migrated
  // 5. On failure: keep local, report error
}
```

### 5.3 ID Strategy

- **Local ID preserved** as `origin_local_id` in meta
- **Supabase generates new UUID** for `id`
- Resource refs are remapped: local attachment IDs → same attachment IDs (they're already Supabase UUIDs from `user_attachments`)

### 5.4 Deduplication

- If a note already exists in Supabase (matched by content hash or origin id), skip
- Use `UNIQUE(note_id, resource_type, resource_id)` constraint on `note_resources`

### 5.5 Migration Version

```typescript
const LOCAL_STORAGE_MIGRATION_STATE_KEY = "nexus-migration:v1:state";
type MigrationState = {
  notesVersion: "v2";        // matches nexus-notes version
  forumVersion: "v1";
  lastExportedAt?: string;
  lastImportedAt?: string;
  migratedIds: string[];     // local IDs already in Supabase
  failedIds: string[];       // local IDs that failed to migrate
};
```

### 5.6 Rollback

- Local data is NEVER deleted during migration
- Migration is additive only
- If Supabase is unavailable, app falls back to localStorage seamlessly
- Future: `notesApi` checks `isSupabaseAvailable()` → uses `SupabaseNotesRepository`, else `LocalStorageNotesRepository`

---

## 6. Repository Interface Pattern

### 6.1 Notes Repository

```typescript
// src/features/notes/notes-backend-types.ts (new in Phase 4B)

export interface NotesRepository {
  listNotes(params?: { workspaceId?: string; query?: string; limit?: number }): Promise<NexusNote[]>;
  getNote(id: string): Promise<NexusNote | null>;
  createNote(input: { title?: string; content?: string; workspaceId?: string }): Promise<NexusNote>;
  updateNote(id: string, patch: { title?: string; content?: string }): Promise<NexusNote | null>;
  deleteNote(id: string): Promise<boolean>;
  addResource(noteId: string, ref: NexusResourceRef): Promise<boolean>;
  removeResource(noteId: string, resourceType: string, resourceId: string): Promise<boolean>;
}
```

### 6.2 Forum Repository

```typescript
// src/features/forum/forum-backend-types.ts (new in Phase 4B)

export interface ForumRepository {
  listThreads(params?: { status?: string; limit?: number; cursor?: string }): Promise<ForumThread[]>;
  getThread(threadId: string): Promise<ForumThreadDetail | null>;
  createThread(input: { title: string; body: string; attachments?: NexusResourceRef[]; author?: NexusAuthorRef }): Promise<ForumThread>;
  createReply(input: { threadId: string; body: string; attachments?: NexusResourceRef[]; author?: NexusAuthorRef }): Promise<ForumReply>;
  deleteThread(threadId: string): Promise<boolean>;
  deleteReply(threadId: string, replyId: string): Promise<boolean>;
}
```

### 6.3 Current Implementation

- `notesApi` (localStorage) implements `NotesRepository` interface shape
- `forumApi` (localStorage) implements `ForumRepository` interface shape
- When Supabase backend is ready: create `SupabaseNotesRepository` implementing same interface
- Swap in `notes-api.ts` transparently — window components unchanged

---

## 7. Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | `notebooks` table name collision | Medium | Use `user_notes` NOT `notes` |
| R2 | RLS blocks legitimate access | Medium | Design policies on paper first; test with `has_workspace_role()` |
| R3 | Local IDs clash with Supabase UUIDs | Low | Keep origin_id in meta; Supabase generates new UUID |
| R4 | Large content exceeds payload limit | Low | Content size validation at API layer (reuse SYNC_PAYLOAD_MAX_BYTES) |
| R5 | Migration data loss | Low | Migration is additive only; local data never deleted |
| R6 | Forum public visibility without auth | Low | Designed but not enabled until Phase 5 |
| R7 | Workspace-level notes permission complexity | Medium | Start account-only; add workspace scope incrementally |

---

## 8. Decision Log

| Decision | Rationale |
|----------|-----------|
| New `user_notes` table, not reuse `notebooks` | Notebooks is workspace-scoped with complex RLS; user_notes is account-first |
| Separate `*_resources` join tables | Follows `artifact_references` pattern; avoids JSON array in main row |
| Soft delete with `deleted_at` | Follows existing `notebooks`, `prompts` pattern |
| `workspace_id` nullable everywhere | Supports both account and workspace scoping |
| Migration is additive, never destructive | Risk-free; can revert by not using Supabase backend |
| Repository interface pattern | Clean swap when backend is ready; zero window component changes |
