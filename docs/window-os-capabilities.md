# NEXUS Window OS — Capability Registry & Product Archetype Map

> Phase 4C — Architecture layer. Defines the shared capability language for the NEXUS platform.

---

## Why a Capability Registry?

NEXUS is not a single product. It's a **platform** where multiple product archetypes coexist:

- **Chat App** (Global Chat) → chat + composer + media-upload
- **Knowledge App** (Notes) → composer + notes-capture + resource-preview
- **Resource App** (Artifact Library) → resource-library + search + media-upload
- **Community App** (Forum) → feed + thread + comments + composer
- **Workspace App** (Workspace) → workspace + chat + resource-library

Without a shared capability language, each new app would re-implement the same features from scratch. The Capability Registry prevents this by:

1. **Defining capabilities once** — e.g. "media-upload" is one concept
2. **Mapping which apps provide them** — Forum and Global Chat both provide "media-upload"
3. **Showing maturity** — is this capability stable, MVP, or planned?
4. **Identifying gaps** — which capabilities does a new product archetype need that don't exist yet?

---

## Window App vs Capability

| Concept | What it is | Example |
|---------|-----------|---------|
| **Window App** | A user-facing window with UI | Global Chat, Forum, Notes |
| **Capability** | A reusable product feature that apps provide | `chat`, `composer`, `media-upload` |
| **Product Archetype** | A design pattern for a type of app | `community-app`, `marketplace-app` |

**One app can provide multiple capabilities.** Forum provides: feed, thread, composer, comments, media-upload, notes-capture.

**One capability can be provided by multiple apps.** `composer` is provided by Global Chat, Forum, and Notes.

---

## Current Capability Inventory

### Stable (used by multiple apps)

| Capability | Provided By |
|-----------|-------------|
| `chat` | global-chat |
| `composer` | global-chat, forum, notes |
| `media-upload` | global-chat, forum |
| `resource-library` | artifact-library |
| `resource-preview` | artifact-preview |
| `notes-capture` | notes, global-chat, forum, artifact-library, artifact-preview |
| `notifications` | kernel |
| `commands` | kernel |
| `workspace` | workspace |

### MVP (first implementation exists)

| Capability | Provided By |
|-----------|-------------|
| `feed` | forum |
| `thread` | forum |
| `comments` | forum |
| `search` | artifact-library |
| `profiles` | global-user, profile-preview, forum |

### Planned (designed, not yet built)

| Capability | Notes |
|-----------|-------|
| `reactions` | Emoji/like system for posts, comments |
| `follow-graph` | User follows, social graph |
| `moderation` | Flagging, reporting, removal |
| `canvas` | Visual editor (Canva-like) |
| `templates` | Pre-built content templates |
| `export` | PDF, PNG, JSON export |
| `collaboration` | Multi-user real-time editing |
| `marketplace` | Task posting, offer management |
| `payments` | Credit/fiat payment processing |
| `reviews` | Ratings and reviews |

---

## Profile Primitive

Phase 5A moves `profiles` from architecture metadata into a shared primitive.
The primitive lives in `src/features/profiles/` and provides:

- `NexusAuthorRef` for lightweight author snapshots on forum posts, replies,
  future marketplace tasks, and future social posts.
- `NexusProfile` for full profile preview display.
- Profile UI primitives: avatar, badge, card, states, and a profile preview
  window app.
- A profile API boundary that reads current auth metadata when available and
  falls back locally when no durable profile table exists.

This capability is identity display only. It does not implement follow graph,
reviews, reputation, payments, seller profiles, edit profile UI, or public
profile routes. Those remain separate future capabilities.

---

## Product Archetype Map

### chat-app
> Text-based conversation. Like ChatGPT, WhatsApp, Slack.

**Required:** chat, composer
**Optional:** media-upload, notifications, search, profiles
**Current apps:** Global Chat

---

### knowledge-app
> Personal knowledge management. Like Notion, Obsidian, Evernote.

**Required:** composer, notes-capture, resource-library, resource-preview
**Optional:** search, templates, export, collaboration
**Current apps:** Notes

---

### resource-app
> Browse and manage files. Like Google Drive, Dropbox.

**Required:** resource-library, resource-preview, media-upload, search
**Optional:** templates, export, collaboration
**Current apps:** Artifact Library, Artifact Preview

---

### community-app
> Discussion forum. Like Reddit, Discourse.

**Required:** feed, thread, comments, composer
**Optional:** media-upload, moderation, notes-capture, search, profiles, reactions
**Current apps:** Forum

---

### social-feed-app
> Media-centric social feed. Like Instagram, Twitter, TikTok.

**Required:** feed, media-upload, profiles, comments, reactions
**Optional:** follow-graph, notifications, moderation, search
**Current apps:** None yet

**Gap analysis:** Missing `reactions`, `follow-graph`. Both are planned.

---

### creative-editor-app
> Visual design canvas. Like Canva, Figma.

**Required:** canvas, media-upload, resource-library, export
**Optional:** templates, collaboration, comments, profiles
**Current apps:** None yet

**Gap analysis:** Missing `canvas`, `templates`, `export`, `collaboration`. All planned.

---

### marketplace-app
> Task marketplace. Like Airtasker, Fiverr.

**Required:** marketplace, profiles, media-upload, comments
**Optional:** payments, reviews, chat, moderation, search
**Current apps:** None yet

**Gap analysis:** Missing `marketplace`, `payments`, `reviews`. All planned.

---

### workspace-app
> AI-powered workspace. Like NEXUS Workspace, Claude Projects.

**Required:** workspace, chat, resource-library, composer
**Optional:** collaboration, notifications, commands, search
**Current apps:** Workspace

---

### admin-app
> Platform administration and configuration.

**Required:** moderation, profiles
**Optional:** search, notifications, commands, export
**Current apps:** Global User (partial)

---

## How to Use the Capability Registry

### When building a new feature
1. Check if the capability already exists (`getCapability("media-upload")`)
2. If it exists and is stable: reuse it
3. If it exists as MVP: extend it
4. If it doesn't exist: add it to `DEFAULT_CAPABILITIES` and build it

### When building a new product archetype
1. Find the closest archetype in `PRODUCT_ARCHETYPES`
2. Check which required capabilities you already have
3. Build the missing ones as capabilities (reusable)
4. Assemble the app from existing capabilities + new ones

### Example: Building a Reddit-like app
1. Archetype: `community-app`
2. Required capabilities already exist: feed, thread, comments, composer
3. Missing optional capabilities: reactions, follow-graph
4. Build `reactions` as a capability (usable by Forum and future Instagram-like)
5. Build `follow-graph` as a capability (usable by social-feed-app)
6. Assemble: RedditWindow = ForumWindow + reactions + follow-graph

---

## Anti-Patterns (Rules to Prevent Over-Abstraction)

1. **Don't create a capability for one app.** If only one app will ever use it, it's not a capability — it's a feature.
2. **Capability registry is metadata, not runtime.** It doesn't control app behavior. It documents what exists.
3. **Capabilities should be concrete.** "feed" is concrete. "content-discovery" is too abstract.
4. **Add sparingly.** Every capability added should have at least 2 potential consumers.
5. **Maturity must be honest.** Don't mark something "stable" until it's used by multiple apps without issues.

---

## Next Steps

- **Phase 5B**: Marketplace Domain Model — design marketplace tables and flows
- **Future**: Forum Backend MVP — migrate from localStorage to Supabase
- **Future**: Notes Backend MVP — migrate from localStorage to Supabase
- **Phase 5C**: Marketplace MVP — build using existing capabilities
