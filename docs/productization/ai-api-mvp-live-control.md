# NEXUS AI API Productization MVP Live Control

Last updated: 2026-06-10

This is the living control document for the prepaid AI API intermediary MVP. Update this file before each implementation round, not after the work is done.

## North Star

Turn NEXUS into a simple but correct AI API intermediary SaaS:

```txt
Operator / Graph / Workflow / Image / Memory
  -> NEXUS backend
  -> plan + model + quota gate
  -> New API
  -> local usage ledger
```

The MVP must be thin enough for a one-person team, but it must not create a wrong architecture that is painful to replace later.

## Non-Negotiables

- Frontend must never call New API directly.
- Frontend must never store, read, or send provider API keys.
- `NEW_API_KEY` must only exist in server env.
- Users must not enter OpenAI, Claude, Gemini, DeepSeek, New API, or provider credentials in the UI.
- Model options shown in normal UI must come from backend model catalog.
- Each Operator keeps its own selected model. There is no global current model.
- Backend must not trust frontend `modelId`.
- Every AI request must be attributable to a user, operator or workflow source, model, request id, and usage amount.

## MVP Scope

Build the minimal correct product layer:

- Server-side model catalog.
- Simple server-side plan config: Free / Basic / Pro.
- Model allowlist per plan.
- Coarse monthly points per plan.
- Coarse model cost multiplier.
- Current-month usage query from local ledger.
- Reject requests when estimated points exceed monthly limit.
- Call New API only from backend.
- Record local usage ledger for success and failure.
- New API quota remains an external safety fuse, not the product source of truth.

## Explicitly Out Of Scope For MVP

- Stripe.
- Invoices.
- Refunds.
- Top-ups.
- Team billing.
- Workspace split billing.
- Full reservation / settlement ledger.
- Cost reconciliation against New API invoices.
- Admin dashboard rebuild.
- Full server-side operator/conversation/message migration in one step.

These are future upgrades, not Phase 1 blockers.

## Current Repo Facts

- Operator model state currently lives on `NexusAgent.model` inside workspace state.
- Operator model updates use `updateAgentModel(agentId, model)`.
- Operators are not yet first-class server-side DB rows.
- Conversations/messages are still partly workspace/local-state centered.
- Existing productized model work has started:
  - `GET /api/models`
  - `POST /api/chat`
  - server model catalog
  - model usage ledger migration
  - read-only model info panel
  - frontend provider credential UI removal
  - runtime provider header removal from major frontend paths
- Because operators are not yet DB rows, exact `operator.userId === currentUser.id` validation is not fully possible yet. MVP ownership should use authenticated user plus workspace permission where available, and record `operatorId` for ledger attribution.

## Current MVP Gap List

- Minimal monthly quota gate is complete for `/api/chat`.
- Simple plan config is centralized for MVP backend use.
- `/api/chat` exists, but existing Operator streaming path still needs full unified gateway alignment.
- Graph LLM, Workflow LLM, Image workflow, Memory, and Predictive routes need to be checked against one shared AI gateway contract.
- Usage ledger exists, but quota reads and monthly point enforcement need to be wired.
- Operator/conversation persistence remains a Phase 2 concern.

## Recommended Implementation Rounds

### Round 1: Live Spec And Guardrail

Status: complete

Goal:
Create this living control document and keep scope narrow.

Acceptance:
- MVP scope is explicit.
- Out-of-scope items are explicit.
- Current repo facts are recorded.
- Next implementation slice is clear.

### Round 2: Minimal Plan And Quota Gate

Status: complete for `/api/chat`; stream and workflow entrypoints continue in Round 3/4

Goal:
Create the smallest backend product gate.

Work:
- Add `plan-config` server module.
- Add `getUserPlan(userId)`.
- Add `getCurrentMonthUsage(userId)`.
- Add `estimateModelPoints(modelId, usageOrEstimate)`.
- Add `assertMonthlyQuotaAvailable(userId, estimatedPoints)`.
- Wire quota check into `/api/chat`.
- Keep plan source simple: env override or profile column fallback.

Acceptance:
- Free user over monthly limit is rejected before New API call.
- Pro user can use Pro model if under quota.
- Tampered Pro model request from Free user is rejected.
- Unknown model is rejected.
- Usage ledger records success and failure.

Completion evidence:
- `npm test -- src/lib/backend/models/model-catalog.test.ts src/lib/backend/models/new-api-chat-service.test.ts src/lib/backend/models/usage-ledger.test.ts src/lib/backend/models/plan-config.test.ts src/lib/backend/models/quota-gate.test.ts src/app/api/chat/route.test.ts`
- `npm run typecheck`
- `npm test`
- `npm run lint`
- Required key/credential scans from this document.

### Round 3: Unified AI Gateway

Status: complete for `/api/chat`; stream and workflow entrypoints continue in Round 4

Goal:
Prevent every route from inventing its own product rules.

Work:
- Create `ai-gateway-service`.
- Move auth/model/feature/quota/New API/usage ledger flow into that service.
- Make `/api/chat` use it.
- Start adapting stream route to use the same service boundary.

Acceptance:
- One test can prove model allowlist + quota + ledger for gateway.
- Route tests verify routes delegate into gateway behavior.
- No route directly decides provider credentials.

Completion evidence:
- `npm test -- src/lib/backend/models/ai-gateway-service.test.ts src/app/api/chat/route.test.ts src/lib/backend/models/model-catalog.test.ts src/lib/backend/models/new-api-chat-service.test.ts src/lib/backend/models/usage-ledger.test.ts src/lib/backend/models/plan-config.test.ts src/lib/backend/models/quota-gate.test.ts`
- `npm run typecheck`
- `npm test`
- `npm run lint`
- Required key/credential scans from this document.

### Round 4: Entrypoint Coverage

Status: Operator stream route, Graph / Workflow Lite LLM, Image workflow, Memory compression, and Predictive intel slices complete; Round 5 verification remains

Goal:
Bring all AI entrypoints under the same gate.

Work:
- Operator chat stream.
- Graph LLM node.
- Workflow LLM node.
- Image workflow with fixed MVP point cost.
- Memory compression.
- Predictive intel.

Acceptance:
- Every AI route uses backend env and gateway rules.
- Graph node cannot bypass plan.
- Image workflow rejects when quota is insufficient.
- Workflow usage includes source type and operator/workflow attribution where available.

Operator stream slice evidence:
- `/api/v1/agents/:agentId/stream` now runs model/plan/monthly quota preflight before provider streaming.
- Over-limit stream requests return `QUOTA_EXCEEDED` before SSE provider streaming opens.
- Stream success writes MVP usage ledger with estimated input/output tokens.
- `npm test -- src/lib/backend/api/api-contract.test.ts -t "rejects over-limit stream requests"`
- `npm test -- src/lib/backend/api/api-contract.test.ts src/lib/backend/runtime/agent-runtime.test.ts`
- `npm run typecheck`
- `npm test`
- `npm run lint`
- Required key/credential scans from this document.

Graph / Workflow Lite LLM slice evidence:
- Existing Graph `model.llm` nodes store their selected model in `node.data.model`.
- Workflow Lite sends that node model through `/api/v1/agents/:agentId/stream` with `X-Nexus-Workflow-Runtime: lite`.
- Workflow Lite requests for models outside the user plan return `PERMISSION_DENIED` and write failed usage ledger rows.
- Successful Workflow Lite LLM streams write usage ledger rows with `operatorId`, `conversationId`, `modelId`, `newApiModel`, provider family, request id, status, and user id.
- `npm test -- src/lib/backend/api/api-contract.test.ts -t "rejects workflow-lite stream requests for models outside the user plan"`
- `npm test -- src/lib/backend/api/api-contract.test.ts -t "lets authenticated workflow-lite stream tasks use the internal execution lane"`

Image workflow slice evidence:
- Server model catalog now tracks model `modality`, keeping image models out of default Operator chat dropdowns.
- `img2` is a server-side image catalog model mapped to `gpt-image-2` and allowed for Basic+ plans.
- `/api/image-gen` checks plan/model/quota before calling the provider when a product user is resolved.
- Image generation uses fixed MVP points by quality: standard `1000`, high `2500`, ultra `5000`.
- Free users requesting `img2` receive `PERMISSION_DENIED` before provider fetch.
- Over-quota Basic users receive `QUOTA_EXCEEDED` before provider fetch.
- Successful image generation writes usage ledger rows with fixed charged points, model id, New API model, provider family, operator id, conversation id, status, and user id.
- Workflow Lite image client passes `operatorId` and `conversationId` to `/api/image-gen`.
- `npm test -- src/app/api/image-gen/route.test.ts`
- `npm test -- src/lib/backend/models/model-catalog.test.ts src/lib/backend/models/plan-config.test.ts`
- `npm test -- src/lib/workflow-runtime-lite/image-client.test.ts src/lib/adapters/image-adapter.test.ts`

Memory / Predictive slice evidence:
- `/api/v1/agents/memory-compress` now checks authenticated user plan, server catalog model, monthly quota, and usage ledger before compression runs.
- Free users requesting Pro-only memory compressor models receive `PERMISSION_DENIED`.
- Over-quota memory compression receives `QUOTA_EXCEEDED` before provider compression.
- Memory compression writes failed ledger rows for denied requests and success ledger rows after accepted requests.
- `/api/predictive-intel` now requires authenticated product access when provider credentials are configured.
- Predictive intel checks server catalog model, plan, monthly quota, and usage ledger before provider fetch.
- Predictive intel denied requests write failed usage rows and do not call provider fetch.
- `npm test -- src/lib/backend/api/api-contract.test.ts -t "rejects memory compression models outside the user plan before compression runs"`
- `npm test -- src/lib/backend/api/api-contract.test.ts -t "rejects predictive intel models outside the user plan before provider fetch"`
- `npm test -- src/lib/backend/api/api-contract.test.ts -t "rejects over-limit memory compression before provider compression"`
- `npm test -- src/lib/backend/api/api-contract.test.ts`
- `npm run typecheck`

### Round 5: MVP Verification Report

Goal:
Prove the MVP is safe enough to build on.

Work:
- Run full test suite.
- Run auth boundary scan.
- Run direct upstream call scan.
- Run frontend secret leakage scan.
- Produce report with completed gates and remaining Phase 2 gaps.

Acceptance:
- `npm test` passes.
- `npm run typecheck` passes.
- `npm run lint` has no new warnings from productization files.
- Security scans show no frontend provider key path.
- Report lists remaining known gaps without pretending they are solved.

## Minimal Plan Defaults

Use these defaults until there is a real admin plan table:

```txt
Free:
  monthly_points: 100000
  models:
    - gpt-4o-mini
    - deepseek-chat

Basic:
  monthly_points: 1000000
  models:
    - gpt-4o-mini
    - deepseek-chat
    - gpt-4o
    - gemini-2.5-flash

Pro:
  monthly_points: 5000000
  models:
    - gpt-4o-mini
    - deepseek-chat
    - gpt-4o
    - gemini-2.5-flash
    - gemini-2.5-pro
    - claude-sonnet-4-20250514
```

## MVP Cost Multipliers

Use coarse points first. Do not chase exact provider pricing in MVP.

```txt
gpt-4o-mini: 1x
deepseek-chat: 1x
gemini-2.5-flash: 1x
gpt-4o: 5x
gemini-2.5-pro: 6x
claude-sonnet-4-20250514: 8x
image workflow: fixed MVP cost per generation
```

## Per-Round Safety Checklist

Before changing code:

- Update this document's current round status.
- Confirm what is deliberately out of scope.
- Identify which routes/files are in scope.
- Add or update tests first where possible.

Before claiming done:

- Run targeted tests.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm test` if route/security behavior changed.
- Run `rg` scans for provider key leakage when frontend/backend auth boundaries changed.

## Required Scans

Frontend/server key leak scan:

```sh
rg -n "NEW_API_KEY|NEW_API_BASE_URL" src --glob '!src/lib/backend/**' --glob '!src/app/api/**' --glob '!**/*.test.ts' --glob '!**/*.test.tsx'
```

Provider credential path scan:

```sh
rg -n "NEXUS_RUNTIME_AUTHORIZATION_HEADER|x-openai-base-url|/api/v1/providers/verify|/api/v1/providers/status|DeepSeek API key|Providers / Model Vault|Global API Vault" src/components src/lib src/app --glob '!**/*.test.ts' --glob '!**/*.test.tsx'
```

Frontend vault implementation scan:

```sh
rg -n "globalApiKey|providerCredentials|setGlobalApiKey|setProviderApiKey|deleteApiKey|lockVault|unlockVault" src/components src/lib src/app --glob '!**/*.test.ts' --glob '!**/*.test.tsx'
```

## Phase 2 Upgrade Hooks

Do not implement these in MVP, but keep paths open:

- Move plan config from code/env to Supabase plan tables.
- Add real quota transaction ledger with reservation and settlement.
- Add operator/conversation/message server-side tables.
- Add admin usage dashboard.
- Add Stripe subscription and top-up.
- Add per-workspace/team billing.
- Add cost reconciliation against New API invoices.

## Current Next Step

Round 5 MVP verification is deferred to the end of the next iteration so it can verify both the existing AI entrypoint gate and the new per-user New API token mapping.

Next iteration live control:

- `docs/productization/per-user-new-api-token-mapping-live-control.md`

Current next work:

1. Implement per-user New API token mapping.
2. Keep New API tokens server-only.
3. Migrate `/api/chat` first, then stream/image/memory/predictive.
4. Run this document's Round 5 MVP verification after that iteration is complete.
