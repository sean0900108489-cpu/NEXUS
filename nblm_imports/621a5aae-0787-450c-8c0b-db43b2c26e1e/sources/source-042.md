# Source 042 - reports__supabase__supabase-current-touchpoints.json.md

## NotebookLM Source Metadata

- notebook_id: 621a5aae-0787-450c-8c0b-db43b2c26e1e
- project: 1022174375734
- source_id: 3bdfe3fc-7f23-4dd4-a09f-869c939506aa
- title: reports__supabase__supabase-current-touchpoints.json.md
- status: SOURCE_STATUS_COMPLETE
- word_count: 13
- token_count: 46
- source_name: projects/1022174375734/locations/global/notebooks/621a5aae-0787-450c-8c0b-db43b2c26e1e/sources/3bdfe3fc-7f23-4dd4-a09f-869c939506aa
- source_added_timestamp: 2026-06-05T05:50:58.862290Z

## Source-Level Read Result

- api_full_text: DATA_GAP
- api_note: NotebookLM source API returned metadata only; no full source text was present in the API response.
- local_mirror_status: FOUND
- local_mirror_path: /Users/sean/Documents/FreeChat/docs/agent-runs/nexus-current-system-intelligence-20260605-1347/reports/supabase/supabase-current-touchpoints.json
- local_mirror_estimated_word_count: 10098

## Local Mirror Content

```json
{
  "sourceTouchpoints": [
    {
      "sourceFile": "src/app/api/image-gen/route.test.ts",
      "layer": "route-handler",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/app/api/image-gen/route.test.ts",
          "line": 18,
          "text": "const ORIGINAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;"
        },
        {
          "file": "src/app/api/image-gen/route.test.ts",
          "line": 19,
          "text": "const ORIGINAL_OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL;"
        },
        {
          "file": "src/app/api/image-gen/route.test.ts",
          "line": 23,
          "text": "process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_API_KEY;"
        },
        {
          "file": "src/app/api/image-gen/route.test.ts",
          "line": 24,
          "text": "process.env.OPENAI_IMAGE_MODEL = ORIGINAL_OPENAI_IMAGE_MODEL;"
        },
        {
          "file": "src/app/api/image-gen/route.test.ts",
          "line": 33,
          "text": "process.env.OPENAI_API_KEY = \"sk-<redacted-token>\";"
        },
        {
          "file": "src/app/api/image-gen/route.test.ts",
          "line": 34,
          "text": "process.env.OPENAI_IMAGE_MODEL = \"img2\";"
        },
        {
          "file": "src/app/api/image-gen/route.test.ts",
          "line": 106,
          "text": "process.env.OPENAI_API_KEY = \"sk-<redacted-token>\";"
        },
        {
          "file": "src/app/api/image-gen/route.test.ts",
          "line": 148,
          "text": "process.env.OPENAI_API_KEY = \"sk-<redacted-token>\";"
        }
      ]
    },
    {
      "sourceFile": "src/app/api/image-gen/route.ts",
      "layer": "route-handler",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/app/api/image-gen/route.ts",
          "line": 16,
          "text": "createSupabaseBearerAuthSessionVerifier,"
        },
        {
          "file": "src/app/api/image-gen/route.ts",
          "line": 49,
          "text": "createSupabaseBearerAuthSessionVerifier();"
        },
        {
          "file": "src/app/api/image-gen/route.ts",
          "line": 59,
          "text": "return normalizeImageApiKeyCandidate(process.env.OPENAI_API_KEY) ?? \"\";"
        },
        {
          "file": "src/app/api/image-gen/route.ts",
          "line": 64,
          "text": "process.env.OPENAI_IMAGE_BASE_URL?.trim() ||"
        },
        {
          "file": "src/app/api/image-gen/route.ts",
          "line": 65,
          "text": "process.env.OPENAI_BASE_URL?.trim() ||"
        },
        {
          "file": "src/app/api/image-gen/route.ts",
          "line": 98,
          "text": "model: getString(payload.model, process.env.OPENAI_IMAGE_MODEL ?? \"img2\"),"
        },
        {
          "file": "src/app/api/image-gen/route.ts",
          "line": 168,
          "text": "authSessionVerifier = createSupabaseBearerAuthSessionVerifier();"
        },
        {
          "file": "src/app/api/image-gen/route.ts",
          "line": 246,
          "text": "return process.env.NODE_ENV === \"production\" || process.env.VERCEL_ENV === \"production\";"
        }
      ]
    },
    {
      "sourceFile": "src/app/api/memory-compress/route.ts",
      "layer": "route-handler",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/app/api/memory-compress/route.ts",
          "line": 30,
          "text": "request.headers.get(\"x-openai-base-url\") || process.env.OPENAI_BASE_URL,"
        }
      ]
    },
    {
      "sourceFile": "src/app/api/predictive-intel/route.ts",
      "layer": "route-handler",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/app/api/predictive-intel/route.ts",
          "line": 142,
          "text": "const model = payload.model?.trim() || process.env.OPENAI_MODEL || \"gpt-4o-mini\";"
        },
        {
          "file": "src/app/api/predictive-intel/route.ts",
          "line": 150,
          "text": "process.env.OPENAI_BASE_URL,"
        },
        {
          "file": "src/app/api/predictive-intel/route.ts",
          "line": 156,
          "text": "const response = await fetch(`${baseUrl}/chat/completions`, {"
        }
      ]
    },
    {
      "sourceFile": "src/app/api/v1/providers/verify/route.ts",
      "layer": "route-handler",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/app/api/v1/workspaces/session/route.ts",
      "layer": "route-handler",
      "functionOrHandler": "apiHandler route or backend boundary",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_URL"
      ],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/app/api/v1/workspaces/session/route.ts",
          "line": 1,
          "text": "import { apiHandler } from \"@/lib/backend/api/api-handler\";"
        },
        {
          "file": "src/app/api/v1/workspaces/session/route.ts",
          "line": 5,
          "text": "createSupabaseBearerAuthSessionVerifier,"
        },
        {
          "file": "src/app/api/v1/workspaces/session/route.ts",
          "line": 25,
          "text": "createSupabaseBearerAuthSessionVerifier();"
        },
        {
          "file": "src/app/api/v1/workspaces/session/route.ts",
          "line": 28,
          "text": "return apiHandler<WorkspaceSessionEnsureRequest, WorkspaceSessionEnsureResponse>({"
        },
        {
          "file": "src/app/api/v1/workspaces/session/route.ts",
          "line": 68,
          "text": "authSessionVerifier = createSupabaseBearerAuthSessionVerifier();"
        },
        {
          "file": "src/app/api/v1/workspaces/session/route.ts",
          "line": 121,
          "text": "const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();"
        },
        {
          "file": "src/app/api/v1/workspaces/session/route.ts",
          "line": 122,
          "text": "const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();"
        },
        {
          "file": "src/app/api/v1/workspaces/session/route.ts",
          "line": 137,
          "text": "const response = await fetch("
        }
      ]
    },
    {
      "sourceFile": "src/app/api/workflow-pro/brain-draft/route.ts",
      "layer": "route-handler",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/app/api/workflow-pro/brain-draft/route.ts",
          "line": 87,
          "text": "const apiKey = process.env.OPENAI_API_KEY?.trim();"
        },
        {
          "file": "src/app/api/workflow-pro/brain-draft/route.ts",
          "line": 96,
          "text": "process.env.WORKFLOW_BRAIN_MODEL?.trim() ||"
        },
        {
          "file": "src/app/api/workflow-pro/brain-draft/route.ts",
          "line": 97,
          "text": "process.env.REPORT_MODEL?.trim() ||"
        },
        {
          "file": "src/app/api/workflow-pro/brain-draft/route.ts",
          "line": 101,
          "text": "const response = await fetch(\"https://api.openai.com/v1/responses\", {"
        },
        {
          "file": "src/app/api/workflow-pro/brain-draft/route.ts",
          "line": 162,
          "text": "process.env.WORKFLOW_BRAIN_REASONING_EFFORT?.trim() ||"
        },
        {
          "file": "src/app/api/workflow-pro/brain-draft/route.ts",
          "line": 171,
          "text": "process.env.WORKFLOW_BRAIN_VERBOSITY?.trim() ||"
        },
        {
          "file": "src/app/api/workflow-pro/brain-draft/route.ts",
          "line": 205,
          "text": "process.env.WORKFLOW_BRAIN_MODEL_TIMEOUT_MS ?? \"\","
        },
        {
          "file": "src/app/api/workflow-pro/brain-draft/route.ts",
          "line": 218,
          "text": "process.env.WORKFLOW_BRAIN_MAX_OUTPUT_TOKENS ?? \"\","
        }
      ]
    },
    {
      "sourceFile": "src/components/nexus/auth-screen.tsx",
      "layer": "ui-component",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "browser-public-client"
        ],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": true,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/components/nexus/nexus-ops.tsx",
      "layer": "ui-component",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "browser-public-client",
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": true,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/components/nexus/nexus-ops.tsx",
          "line": 108,
          "text": "nexusApiClient,"
        },
        {
          "file": "src/components/nexus/nexus-ops.tsx",
          "line": 498,
          "text": "return Array.from("
        },
        {
          "file": "src/components/nexus/nexus-ops.tsx",
          "line": 600,
          "text": "classList: target ? Array.from(target.classList) : [],"
        },
        {
          "file": "src/components/nexus/nexus-ops.tsx",
          "line": 668,
          "text": "return Array.from("
        },
        {
          "file": "src/components/nexus/nexus-ops.tsx",
          "line": 1132,
          "text": "const response = await fetch(url, {"
        },
        {
          "file": "src/components/nexus/nexus-ops.tsx",
          "line": 1317,
          "text": "void fetch(\"/api/v1/providers/status\", { cache: \"no-store\" })"
        },
        {
          "file": "src/components/nexus/nexus-ops.tsx",
          "line": 2387,
          "text": "const response = await nexusApiClient.get<ArtifactGetResponse>("
        },
        {
          "file": "src/components/nexus/nexus-ops.tsx",
          "line": 2446,
          "text": "const response = await nexusApiClient.get<ArtifactGetResponse>("
        }
      ]
    },
    {
      "sourceFile": "src/components/style-engine/nexus-style-lab-surface-style-coverage.test.ts",
      "layer": "ui-component",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": true,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/components/style-engine/nexus-style-lab.tsx",
      "layer": "ui-component",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": true,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/adapters/image-adapter.test.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/adapters/image-adapter.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "browser-public-client",
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": true,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/adapters/image-adapter.ts",
          "line": 186,
          "text": "const response = await fetch("
        },
        {
          "file": "src/lib/adapters/image-adapter.ts",
          "line": 266,
          "text": "const response = await fetch(\"/api/image-gen\", {"
        }
      ]
    },
    {
      "sourceFile": "src/lib/adapters/memory-compression-adapter.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/adapters/memory-compression-adapter.ts",
          "line": 8,
          "text": "nexusApiClient,"
        },
        {
          "file": "src/lib/adapters/memory-compression-adapter.ts",
          "line": 189,
          "text": "const result = await nexusApiClient.post<unknown, MemoryCompressionPayload>("
        }
      ]
    },
    {
      "sourceFile": "src/lib/api/nexus-api-client.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "browser-public-client",
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": true,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/api/nexus-api-client.ts",
          "line": 137,
          "text": "const response = await fetch(path, {"
        },
        {
          "file": "src/lib/api/nexus-api-client.ts",
          "line": 179,
          "text": "export const nexusApiClient = new FetchNexusApiClient();"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/api/agent-stream-service.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/backend/api/agent-stream-service.ts",
          "line": 105,
          "text": "process.env.OPENAI_BASE_URL ||"
        },
        {
          "file": "src/lib/backend/api/agent-stream-service.ts",
          "line": 393,
          "text": "return process.env.OPENAI_API_KEY?.replace(/[^\\x20-\\x7E]/g, \"\").trim() ?? \"\";"
        },
        {
          "file": "src/lib/backend/api/agent-stream-service.ts",
          "line": 709,
          "text": "process.env.OPENAI_MODEL ||"
        },
        {
          "file": "src/lib/backend/api/agent-stream-service.ts",
          "line": 719,
          "text": "fetch(`${baseUrl}/chat/completions`, {"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/api/api-auth-test-helper.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/backend/api/api-contract.test.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "apiHandler route or backend boundary",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_URL"
      ],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/backend/api/api-contract.test.ts",
          "line": 14,
          "text": "import { nexusApiClient, NexusApiError } from \"@/lib/api/nexus-api-client\";"
        },
        {
          "file": "src/lib/backend/api/api-contract.test.ts",
          "line": 15,
          "text": "import { apiHandler } from \"@/lib/backend/api/api-handler\";"
        },
        {
          "file": "src/lib/backend/api/api-contract.test.ts",
          "line": 80,
          "text": "describe(\"apiHandler envelope and validation\", () => {"
        },
        {
          "file": "src/lib/backend/api/api-contract.test.ts",
          "line": 135,
          "text": "const handler = apiHandler({"
        },
        {
          "file": "src/lib/backend/api/api-contract.test.ts",
          "line": 183,
          "text": "const handler = apiHandler({"
        },
        {
          "file": "src/lib/backend/api/api-contract.test.ts",
          "line": 210,
          "text": "const handler = apiHandler({"
        },
        {
          "file": "src/lib/backend/api/api-contract.test.ts",
          "line": 251,
          "text": "const handler = apiHandler({"
        },
        {
          "file": "src/lib/backend/api/api-contract.test.ts",
          "line": 294,
          "text": "const handler = apiHandler({"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/api/idempotency-repository.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "api_idempotency_keys"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/api/idempotency-repository.ts",
          "line": 114,
          "text": ".from(\"api_idempotency_keys\")"
        },
        {
          "file": "src/lib/backend/api/idempotency-repository.ts",
          "line": 130,
          "text": ".from(\"api_idempotency_keys\")"
        },
        {
          "file": "src/lib/backend/api/idempotency-repository.ts",
          "line": 175,
          "text": ".from(\"api_idempotency_keys\")"
        },
        {
          "file": "src/lib/backend/api/idempotency-repository.ts",
          "line": 204,
          "text": ".from(\"api_idempotency_keys\")"
        },
        {
          "file": "src/lib/backend/api/idempotency-repository.ts",
          "line": 224,
          "text": ".from(\"api_idempotency_keys\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/api/memory-compress-service.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/backend/api/memory-compress-service.ts",
          "line": 404,
          "text": "let response = await fetch(`${baseUrl}/chat/completions`, requestInit(true));"
        },
        {
          "file": "src/lib/backend/api/memory-compress-service.ts",
          "line": 410,
          "text": "response = await fetch(`${baseUrl}/chat/completions`, requestInit(false));"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/artifacts/artifact-repository.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "artifact_references",
          "artifacts"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/artifacts/artifact-repository.ts",
          "line": 217,
          "text": ".from(\"artifacts\")"
        },
        {
          "file": "src/lib/backend/artifacts/artifact-repository.ts",
          "line": 231,
          "text": ".from(\"artifacts\")"
        },
        {
          "file": "src/lib/backend/artifacts/artifact-repository.ts",
          "line": 245,
          "text": ".from(\"artifacts\")"
        },
        {
          "file": "src/lib/backend/artifacts/artifact-repository.ts",
          "line": 276,
          "text": ".from(\"artifacts\")"
        },
        {
          "file": "src/lib/backend/artifacts/artifact-repository.ts",
          "line": 309,
          "text": ".from(\"artifact_references\")"
        },
        {
          "file": "src/lib/backend/artifacts/artifact-repository.ts",
          "line": 326,
          "text": ".from(\"artifact_references\")"
        },
        {
          "file": "src/lib/backend/artifacts/artifact-repository.ts",
          "line": 339,
          "text": ".from(\"artifact_references\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/artifacts/artifact-service.test.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/backend/deployment/deployment-check-service.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "deployment_checks"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/deployment/deployment-check-service.ts",
          "line": 88,
          "text": ".from(\"deployment_checks\")"
        },
        {
          "file": "src/lib/backend/deployment/deployment-check-service.ts",
          "line": 102,
          "text": ".from(\"deployment_checks\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/deployment/environment-validator.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/backend/deployment/feature-flag-service.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "feature_flags"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/deployment/feature-flag-service.ts",
          "line": 94,
          "text": ".from(\"feature_flags\")"
        },
        {
          "file": "src/lib/backend/deployment/feature-flag-service.ts",
          "line": 107,
          "text": ".from(\"feature_flags\")"
        },
        {
          "file": "src/lib/backend/deployment/feature-flag-service.ts",
          "line": 128,
          "text": ".from(\"feature_flags\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/history/agent-memory-record-repository.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "agent_memory_records"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/history/agent-memory-record-repository.ts",
          "line": 92,
          "text": ".from(\"agent_memory_records\")"
        },
        {
          "file": "src/lib/backend/history/agent-memory-record-repository.ts",
          "line": 106,
          "text": ".from(\"agent_memory_records\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/history/message-history-service.test.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/backend/history/message-history-service.test.ts",
          "line": 121,
          "text": "messages.seed(Array.from({ length: 150 }, (_value, index) => makeMessage(index)));"
        },
        {
          "file": "src/lib/backend/history/message-history-service.test.ts",
          "line": 148,
          "text": "messages.seed(Array.from({ length: 8 }, (_value, index) => makeMessage(index)));"
        },
        {
          "file": "src/lib/backend/history/message-history-service.test.ts",
          "line": 209,
          "text": "Array.from({ length: 3 }, (_value, index) => makeMessage(index)),"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/history/message-repository.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "messages"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/history/message-repository.ts",
          "line": 172,
          "text": ".from(\"messages\")"
        },
        {
          "file": "src/lib/backend/history/message-repository.ts",
          "line": 186,
          "text": ".from(\"messages\")"
        },
        {
          "file": "src/lib/backend/history/message-repository.ts",
          "line": 240,
          "text": ".from(\"messages\")"
        },
        {
          "file": "src/lib/backend/history/message-repository.ts",
          "line": 254,
          "text": ".from(\"messages\")"
        },
        {
          "file": "src/lib/backend/history/message-repository.ts",
          "line": 271,
          "text": ".from(\"messages\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/history/storage-partition-service.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [
        "NEXTAUTH_SECRET",
        "SUPABASE_SERVICE_ROLE_KEY"
      ],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/backend/history/storage-partition-service.ts",
          "line": 97,
          "text": "const actualBuffer = Buffer.from(signature);"
        },
        {
          "file": "src/lib/backend/history/storage-partition-service.ts",
          "line": 98,
          "text": "const expectedBuffer = Buffer.from(expected);"
        },
        {
          "file": "src/lib/backend/history/storage-partition-service.ts",
          "line": 109,
          "text": "const decoded = JSON.parse(Buffer.from(body, \"base64url\").toString(\"utf8\")) as Partial<HistoryCursorPayload>;"
        },
        {
          "file": "src/lib/backend/history/storage-partition-service.ts",
          "line": 129,
          "text": "return Buffer.from(value, \"utf8\").toString(\"base64url\");"
        },
        {
          "file": "src/lib/backend/history/storage-partition-service.ts",
          "line": 134,
          "text": "process.env.HISTORY_CURSOR_SECRET ||"
        },
        {
          "file": "src/lib/backend/history/storage-partition-service.ts",
          "line": 135,
          "text": "process.env.NEXTAUTH_SECRET ||"
        },
        {
          "file": "src/lib/backend/history/storage-partition-service.ts",
          "line": 136,
          "text": "process.env.SUPABASE_SERVICE_ROLE_KEY ||"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/image-generation/generated-image-asset-storage.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [
          "nexus-generated-assets"
        ],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/backend/image-generation/generated-image-asset-storage.ts",
          "line": 64,
          "text": ".from(GENERATED_IMAGE_STORAGE_BUCKET)"
        },
        {
          "file": "src/lib/backend/image-generation/generated-image-asset-storage.ts",
          "line": 65,
          "text": ".upload(path, Buffer.from(input.bytes), {"
        },
        {
          "file": "src/lib/backend/image-generation/generated-image-asset-storage.ts",
          "line": 107,
          "text": ".from(GENERATED_IMAGE_STORAGE_BUCKET)"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/notebooks/notebook-repository.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "notebooks",
          "workspace_memberships"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/notebooks/notebook-repository.ts",
          "line": 156,
          "text": ".from(\"notebooks\")"
        },
        {
          "file": "src/lib/backend/notebooks/notebook-repository.ts",
          "line": 189,
          "text": ".from(\"notebooks\")"
        },
        {
          "file": "src/lib/backend/notebooks/notebook-repository.ts",
          "line": 216,
          "text": ".from(\"notebooks\")"
        },
        {
          "file": "src/lib/backend/notebooks/notebook-repository.ts",
          "line": 239,
          "text": ".from(\"notebooks\")"
        },
        {
          "file": "src/lib/backend/notebooks/notebook-repository.ts",
          "line": 279,
          "text": ".from(\"notebooks\")"
        },
        {
          "file": "src/lib/backend/notebooks/notebook-repository.ts",
          "line": 315,
          "text": ".from(\"notebooks\")"
        },
        {
          "file": "src/lib/backend/notebooks/notebook-repository.ts",
          "line": 334,
          "text": ".from(\"workspace_memberships\")"
        },
        {
          "file": "src/lib/backend/notebooks/notebook-repository.ts",
          "line": 349,
          "text": ".from(\"workspace_memberships\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/notebooks/notebook-route.test.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/backend/observability/observability-service.test.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/backend/observability/system-event-repository.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "system_events"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/observability/system-event-repository.ts",
          "line": 125,
          "text": ".from(\"system_events\")"
        },
        {
          "file": "src/lib/backend/observability/system-event-repository.ts",
          "line": 139,
          "text": ".from(\"system_events\")"
        },
        {
          "file": "src/lib/backend/observability/system-event-repository.ts",
          "line": 177,
          "text": ".from(\"system_events\")"
        },
        {
          "file": "src/lib/backend/observability/system-event-repository.ts",
          "line": 199,
          "text": ".from(\"system_events\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/observability/usage-metrics-repository.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "usage_metrics"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/observability/usage-metrics-repository.ts",
          "line": 135,
          "text": ".from(\"usage_metrics\")"
        },
        {
          "file": "src/lib/backend/observability/usage-metrics-repository.ts",
          "line": 150,
          "text": ".from(\"usage_metrics\")"
        },
        {
          "file": "src/lib/backend/observability/usage-metrics-repository.ts",
          "line": 188,
          "text": ".from(\"usage_metrics\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/primitives/redaction.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/backend/prompts/prompt-repository.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "prompt_revisions",
          "prompts",
          "workspace_memberships"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/prompts/prompt-repository.ts",
          "line": 142,
          "text": ".from(\"prompts\")"
        },
        {
          "file": "src/lib/backend/prompts/prompt-repository.ts",
          "line": 157,
          "text": ".from(\"prompt_revisions\")"
        },
        {
          "file": "src/lib/backend/prompts/prompt-repository.ts",
          "line": 181,
          "text": ".from(\"prompts\")"
        },
        {
          "file": "src/lib/backend/prompts/prompt-repository.ts",
          "line": 208,
          "text": ".from(\"prompt_revisions\")"
        },
        {
          "file": "src/lib/backend/prompts/prompt-repository.ts",
          "line": 230,
          "text": ".from(\"prompts\")"
        },
        {
          "file": "src/lib/backend/prompts/prompt-repository.ts",
          "line": 261,
          "text": ".from(\"prompts\")"
        },
        {
          "file": "src/lib/backend/prompts/prompt-repository.ts",
          "line": 275,
          "text": ".from(\"workspace_memberships\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/prompts/prompt-route.test.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/backend/runtime/agent-runtime-repository.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "agent_runtime_events",
          "agent_runtime_sessions",
          "agent_tasks"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/runtime/agent-runtime-repository.ts",
          "line": 180,
          "text": ".from(\"agent_runtime_sessions\")"
        },
        {
          "file": "src/lib/backend/runtime/agent-runtime-repository.ts",
          "line": 205,
          "text": ".from(\"agent_runtime_sessions\")"
        },
        {
          "file": "src/lib/backend/runtime/agent-runtime-repository.ts",
          "line": 229,
          "text": ".from(\"agent_runtime_sessions\")"
        },
        {
          "file": "src/lib/backend/runtime/agent-runtime-repository.ts",
          "line": 243,
          "text": ".from(\"agent_tasks\")"
        },
        {
          "file": "src/lib/backend/runtime/agent-runtime-repository.ts",
          "line": 268,
          "text": ".from(\"agent_tasks\")"
        },
        {
          "file": "src/lib/backend/runtime/agent-runtime-repository.ts",
          "line": 289,
          "text": ".from(\"agent_tasks\")"
        },
        {
          "file": "src/lib/backend/runtime/agent-runtime-repository.ts",
          "line": 309,
          "text": ".from(\"agent_runtime_events\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/runtime/agent-runtime-service.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/backend/runtime/agent-runtime.test.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/backend/runtime/provider-adapter.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/backend/security/auth-boundary-gate.test.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "apiHandler route or backend boundary",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/backend/security/auth-boundary-gate.test.ts",
          "line": 29,
          "text": "apiHandlerRoutes: number;"
        },
        {
          "file": "src/lib/backend/security/auth-boundary-gate.test.ts",
          "line": 54,
          "text": "expect(report.routeInventory.apiHandlerRoutes).toBeGreaterThanOrEqual(1);"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/security/auth-session.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_URL"
      ],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/backend/security/auth-session.ts",
          "line": 48,
          "text": "export function createSupabaseBearerAuthSessionVerifier() {"
        },
        {
          "file": "src/lib/backend/security/auth-session.ts",
          "line": 57,
          "text": "const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();"
        },
        {
          "file": "src/lib/backend/security/auth-session.ts",
          "line": 58,
          "text": "const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();"
        },
        {
          "file": "src/lib/backend/security/auth-session.ts",
          "line": 181,
          "text": "return Buffer.from(value, \"base64\").toString(\"utf8\");"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/security/frontend-bundle-safety.test.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/backend/security/frontend-bundle-safety.test.ts",
          "line": 38,
          "text": "expect(browserSource).not.toContain(\"createAdminSupabaseClient\");"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/security/repositories.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "permission_audit_logs",
          "workspace_memberships"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/security/repositories.ts",
          "line": 61,
          "text": ".from(\"workspace_memberships\")"
        },
        {
          "file": "src/lib/backend/security/repositories.ts",
          "line": 116,
          "text": "const { error } = await this.client.from(\"permission_audit_logs\").insert(row);"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/security/route-spoof-boundary.test.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/backend/security/secret-boundary-service.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/backend/security/security-services.test.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/backend/sync/sync-operation-repository.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "sync_operations"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/sync/sync-operation-repository.ts",
          "line": 259,
          "text": ".from(\"sync_operations\")"
        },
        {
          "file": "src/lib/backend/sync/sync-operation-repository.ts",
          "line": 273,
          "text": ".from(\"sync_operations\")"
        },
        {
          "file": "src/lib/backend/sync/sync-operation-repository.ts",
          "line": 287,
          "text": ".from(\"sync_operations\")"
        },
        {
          "file": "src/lib/backend/sync/sync-operation-repository.ts",
          "line": 390,
          "text": ".from(\"sync_operations\")"
        },
        {
          "file": "src/lib/backend/sync/sync-operation-repository.ts",
          "line": 410,
          "text": ".from(\"sync_operations\")"
        },
        {
          "file": "src/lib/backend/sync/sync-operation-repository.ts",
          "line": 438,
          "text": ".from(\"sync_operations\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/sync/sync-queue.test.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/backend/tools/tool-permission-repository.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "tool_permissions"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/tools/tool-permission-repository.ts",
          "line": 63,
          "text": ".from(\"tool_permissions\")"
        },
        {
          "file": "src/lib/backend/tools/tool-permission-repository.ts",
          "line": 86,
          "text": ".from(\"tool_permissions\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/tools/tool-run-repository.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "tool_runs"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/tools/tool-run-repository.ts",
          "line": 168,
          "text": ".from(\"tool_runs\")"
        },
        {
          "file": "src/lib/backend/tools/tool-run-repository.ts",
          "line": 182,
          "text": ".from(\"tool_runs\")"
        },
        {
          "file": "src/lib/backend/tools/tool-run-repository.ts",
          "line": 196,
          "text": ".from(\"tool_runs\")"
        },
        {
          "file": "src/lib/backend/tools/tool-run-repository.ts",
          "line": 231,
          "text": ".from(\"tool_runs\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/workspace/workspace-permission-request.test.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/backend/workspace/workspace-permission.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "workspace_memberships",
          "workspaces"
        ],
        "rpcs": [
          "record_permission_audit_log"
        ],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/workspace/workspace-permission.ts",
          "line": 41,
          "text": "if (process.env.NODE_ENV === \"production\") {"
        },
        {
          "file": "src/lib/backend/workspace/workspace-permission.ts",
          "line": 74,
          "text": ".from(\"workspace_memberships\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-permission.ts",
          "line": 111,
          "text": ".from(\"workspaces\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-permission.ts",
          "line": 124,
          "text": ".from(\"workspace_memberships\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-permission.ts",
          "line": 138,
          "text": ".from(\"workspaces\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-permission.ts",
          "line": 152,
          "text": ".from(\"workspace_memberships\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-permission.ts",
          "line": 184,
          "text": ").rpc("
        },
        {
          "file": "src/lib/backend/workspace/workspace-permission.ts",
          "line": 258,
          "text": "return process.env.NODE_ENV === \"production\" || process.env.VERCEL_ENV === \"production\";"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/workspace/workspace-session-service.test.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/backend/workspace/workspace-session-service.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "workspace_memberships",
          "workspaces"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/workspace/workspace-session-service.ts",
          "line": 152,
          "text": ".from(\"workspace_memberships\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-session-service.ts",
          "line": 167,
          "text": ".from(\"workspace_memberships\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-session-service.ts",
          "line": 181,
          "text": ".from(\"workspaces\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-session-service.ts",
          "line": 207,
          "text": ".from(\"workspaces\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-session-service.ts",
          "line": 222,
          "text": ".from(\"workspace_memberships\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-session-service.ts",
          "line": 341,
          "text": "return process.env.NODE_ENV === \"production\" || process.env.VERCEL_ENV === \"production\";"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/workspace/workspace-snapshot-repository.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "workspace_snapshots"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/workspace/workspace-snapshot-repository.ts",
          "line": 173,
          "text": ".from(\"workspace_snapshots\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-snapshot-repository.ts",
          "line": 187,
          "text": ".from(\"workspace_snapshots\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-snapshot-repository.ts",
          "line": 204,
          "text": ".from(\"workspace_snapshots\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-snapshot-repository.ts",
          "line": 221,
          "text": ".from(\"workspace_snapshots\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-snapshot-repository.ts",
          "line": 239,
          "text": ".from(\"workspace_snapshots\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-snapshot-repository.ts",
          "line": 263,
          "text": ".from(\"workspace_snapshots\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-snapshot-repository.ts",
          "line": 280,
          "text": ".from(\"workspace_snapshots\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-snapshot-repository.ts",
          "line": 297,
          "text": ".from(\"workspace_snapshots\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/workspace/workspace-state-entity-repository.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "workspace_state_entities"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/backend/workspace/workspace-state-entity-repository.ts",
          "line": 79,
          "text": ".from(\"workspace_state_entities\")"
        },
        {
          "file": "src/lib/backend/workspace/workspace-state-entity-repository.ts",
          "line": 92,
          "text": ".from(\"workspace_state_entities\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/backend/workspace/workspace-state.test.ts",
      "layer": "backend-service-repository",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/state-sync.ts",
      "layer": "state-sync-bridge",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "prompt_revisions",
          "workflow_templates"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [
          "browser-public-client",
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_URL"
      ],
      "frontendVisibleLikely": true,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/state-sync.ts",
          "line": 30,
          "text": "import { nexusApiClient, NexusApiError } from \"@/lib/api/nexus-api-client\";"
        },
        {
          "file": "src/lib/state-sync.ts",
          "line": 184,
          "text": "const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();"
        },
        {
          "file": "src/lib/state-sync.ts",
          "line": 185,
          "text": "const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();"
        },
        {
          "file": "src/lib/state-sync.ts",
          "line": 191,
          "text": "const response = await fetch("
        },
        {
          "file": "src/lib/state-sync.ts",
          "line": 624,
          "text": ".from(\"workflow_templates\")"
        },
        {
          "file": "src/lib/state-sync.ts",
          "line": 660,
          "text": ".from(\"workflow_templates\")"
        },
        {
          "file": "src/lib/state-sync.ts",
          "line": 704,
          "text": "await nexusApiClient.post<ArtifactCreateResponse, CreateArtifactRequest>("
        },
        {
          "file": "src/lib/state-sync.ts",
          "line": 741,
          "text": "const response = await nexusApiClient.get<ArtifactListResponse>("
        }
      ]
    },
    {
      "sourceFile": "src/lib/style-engine/exchange.test.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "review",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/style-engine/governance.test.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "review",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/style-engine/import-text.test.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "review",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/style-engine/v2-review-import.test.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "review",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/style-engine/v2-token-preview.test.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "review",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/style-engine/v2-validators.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "review",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/style-engine/validator.test.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "review",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/style-engine/validator.test.ts",
          "line": 537,
          "text": "app: \"process.env.PRIVATE_STYLE_TOKEN\","
        }
      ]
    },
    {
      "sourceFile": "src/lib/style-engine/validator.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "review",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/supabase/admin.ts",
      "layer": "supabase-client-boundary",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [],
        "realtime": []
      },
      "envVarNames": [
        "NEXT_PUBLIC_SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY"
      ],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/supabase/admin.ts",
          "line": 11,
          "text": "process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,"
        },
        {
          "file": "src/lib/supabase/admin.ts",
          "line": 16,
          "text": "const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;"
        },
        {
          "file": "src/lib/supabase/admin.ts",
          "line": 17,
          "text": "const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;"
        }
      ]
    },
    {
      "sourceFile": "src/lib/supabase/client.test.ts",
      "layer": "supabase-client-boundary",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "browser-public-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": true,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/supabase/client.ts",
      "layer": "supabase-client-boundary",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "browser-public-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_URL"
      ],
      "frontendVisibleLikely": true,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/supabase/client.ts",
          "line": 22,
          "text": "process.env.NEXT_PUBLIC_SUPABASE_URL,"
        },
        {
          "file": "src/lib/supabase/client.ts",
          "line": 23,
          "text": "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,"
        },
        {
          "file": "src/lib/supabase/client.ts",
          "line": 82,
          "text": "const response = await fetch(PUBLIC_CONFIG_ROUTE, {"
        }
      ]
    },
    {
      "sourceFile": "src/lib/supabase/request.ts",
      "layer": "supabase-client-boundary",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": []
      },
      "envVarNames": [
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_URL"
      ],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/supabase/request.ts",
          "line": 9,
          "text": "process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&"
        },
        {
          "file": "src/lib/supabase/request.ts",
          "line": 10,
          "text": "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),"
        },
        {
          "file": "src/lib/supabase/request.ts",
          "line": 17,
          "text": "const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();"
        },
        {
          "file": "src/lib/supabase/request.ts",
          "line": 18,
          "text": "const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();"
        }
      ]
    },
    {
      "sourceFile": "src/lib/supabase/test-connection.ts",
      "layer": "supabase-client-boundary",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [
          "workspaces"
        ],
        "rpcs": [],
        "storage": [],
        "auth": [
          "browser-public-client"
        ],
        "realtime": []
      },
      "envVarNames": [
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_URL"
      ],
      "frontendVisibleLikely": true,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "requires local migration/RLS cross-check",
      "evidence": [
        {
          "file": "src/lib/supabase/test-connection.ts",
          "line": 26,
          "text": "anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? \"present\" : \"missing\","
        },
        {
          "file": "src/lib/supabase/test-connection.ts",
          "line": 27,
          "text": "url: process.env.NEXT_PUBLIC_SUPABASE_URL ? \"present\" : \"missing\","
        },
        {
          "file": "src/lib/supabase/test-connection.ts",
          "line": 54,
          "text": ".from(\"workspaces\")"
        }
      ]
    },
    {
      "sourceFile": "src/lib/sync/local-sync-queue-adapter.test.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/sync/local-sync-queue-adapter.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "browser-public-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": true,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/lib/sync/local-sync-queue-adapter.ts",
          "line": 3,
          "text": "import { nexusApiClient, NexusApiError } from \"@/lib/api/nexus-api-client\";"
        },
        {
          "file": "src/lib/sync/local-sync-queue-adapter.ts",
          "line": 329,
          "text": "const response = await nexusApiClient.post<"
        },
        {
          "file": "src/lib/sync/local-sync-queue-adapter.ts",
          "line": 528,
          "text": "const hex = Array.from(new Uint8Array(digest))"
        }
      ]
    },
    {
      "sourceFile": "src/lib/workflow-runtime-lite/llm-client.test.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": false,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/workflow-runtime-lite/llm-client.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "browser-public-client",
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": true,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/lib/workflow-runtime-lite/state.ts",
      "layer": "shared-lib",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": false,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": []
    },
    {
      "sourceFile": "src/store/nexus-store.ts",
      "layer": "state-store",
      "functionOrHandler": "source-level touchpoint",
      "tableViewRpcAuthStorageRealtime": {
        "tables": [],
        "rpcs": [],
        "storage": [],
        "auth": [
          "browser-public-client",
          "request-user-token-client"
        ],
        "realtime": [
          "realtime signal"
        ]
      },
      "envVarNames": [],
      "frontendVisibleLikely": true,
      "serviceRoleExposureRisk": "not indicated by static layer",
      "typeContractLikely": true,
      "migrationSchemaMatchUnknown": "matched by table/function name only; live schema not queried",
      "rlsRisk": "not applicable",
      "evidence": [
        {
          "file": "src/store/nexus-store.ts",
          "line": 26,
          "text": "nexusApiClient,"
        },
        {
          "file": "src/store/nexus-store.ts",
          "line": 724,
          "text": "return Array.from(new Set([name, ...LEGACY_LOCAL_STORAGE_KEYS]));"
        },
        {
          "file": "src/store/nexus-store.ts",
          "line": 1435,
          "text": "const supportedModels = Array.from("
        },
        {
          "file": "src/store/nexus-store.ts",
          "line": 2759,
          "text": "supportedModels: Array.from("
        },
        {
          "file": "src/store/nexus-store.ts",
          "line": 3408,
          "text": "openNotebookIds: Array.from("
        },
        {
          "file": "src/store/nexus-store.ts",
          "line": 4444,
          "text": "const response = await nexusApiClient.post<ToolRunResponse, ToolRunRequest>("
        },
        {
          "file": "src/store/nexus-store.ts",
          "line": 4715,
          "text": "const cancelled = await nexusApiClient.post<"
        },
        {
          "file": "src/store/nexus-store.ts",
          "line": 4737,
          "text": "return nexusApiClient.post<ToolRunConfirmResponse, { workspaceId: string }>("
        }
      ]
    }
  ],
  "migrationTouchpoints": [
    {
      "file": "supabase/migrations/20260525000000_create_workflow_templates.sql",
      "lineCount": 13,
      "tables": [
        "workflow_templates"
      ],
      "functions": [],
      "policies": [],
      "enablesRlsSignal": false,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260525000000_create_workflow_templates.sql",
          "line": 2,
          "text": "CREATE TABLE IF NOT EXISTS public.workflow_templates ("
        },
        {
          "file": "supabase/migrations/20260525000000_create_workflow_templates.sql",
          "line": 11,
          "text": "ALTER TABLE public.workflow_templates DISABLE ROW LEVEL SECURITY;"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260527000000_security_boundary_rls_foundation.sql",
      "lineCount": 607,
      "tables": [
        "artifacts",
        "messages",
        "notebooks",
        "permission_audit_logs",
        "prompts",
        "workflow_templates",
        "workspace_memberships",
        "workspaces"
      ],
      "functions": [
        "has_workspace_role",
        "is_workspace_member",
        "set_updated_at"
      ],
      "policies": [
        "artifacts_delete_workspace_editor",
        "artifacts_insert_workspace_editor",
        "artifacts_select_workspace_member",
        "artifacts_update_workspace_editor",
        "messages_delete_workspace_editor",
        "messages_insert_workspace_editor",
        "messages_select_workspace_member",
        "messages_update_workspace_editor",
        "notebooks_delete_workspace_editor",
        "notebooks_insert_workspace_editor",
        "notebooks_select_workspace_member",
        "notebooks_update_workspace_editor",
        "prompts_delete_workspace_editor",
        "prompts_insert_workspace_editor",
        "prompts_select_workspace_member",
        "prompts_update_workspace_editor",
        "workflow_templates_delete_workspace_editor",
        "workflow_templates_insert_workspace_editor",
        "workflow_templates_select_workspace_member",
        "workflow_templates_update_workspace_editor",
        "workspace_memberships_delete_manager",
        "workspace_memberships_insert_manager",
        "workspace_memberships_select_self_or_manager",
        "workspace_memberships_update_manager",
        "workspaces_delete_owner_admin",
        "workspaces_insert_owner_or_legacy",
        "workspaces_select_member",
        "workspaces_update_editor_or_legacy"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260527000000_security_boundary_rls_foundation.sql",
          "line": 13,
          "text": "CREATE TABLE IF NOT EXISTS public.workspace_memberships ("
        },
        {
          "file": "supabase/migrations/20260527000000_security_boundary_rls_foundation.sql",
          "line": 50,
          "text": "ALTER TABLE public.workspace_memberships"
        },
        {
          "file": "supabase/migrations/20260527000000_security_boundary_rls_foundation.sql",
          "line": 67,
          "text": "ALTER TABLE public.workspace_memberships"
        },
        {
          "file": "supabase/migrations/20260527000000_security_boundary_rls_foundation.sql",
          "line": 77,
          "text": "CREATE TABLE IF NOT EXISTS public.permission_audit_logs ("
        },
        {
          "file": "supabase/migrations/20260527000000_security_boundary_rls_foundation.sql",
          "line": 107,
          "text": "ALTER TABLE public.workspaces"
        },
        {
          "file": "supabase/migrations/20260527000000_security_boundary_rls_foundation.sql",
          "line": 117,
          "text": "ALTER TABLE public.messages"
        },
        {
          "file": "supabase/migrations/20260527000000_security_boundary_rls_foundation.sql",
          "line": 125,
          "text": "ALTER TABLE public.artifacts"
        },
        {
          "file": "supabase/migrations/20260527000000_security_boundary_rls_foundation.sql",
          "line": 133,
          "text": "ALTER TABLE public.prompts"
        },
        {
          "file": "supabase/migrations/20260527000000_security_boundary_rls_foundation.sql",
          "line": 139,
          "text": "ALTER TABLE public.notebooks"
        },
        {
          "file": "supabase/migrations/20260527000000_security_boundary_rls_foundation.sql",
          "line": 145,
          "text": "ALTER TABLE public.workflow_templates"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260527001000_api_idempotency_keys.sql",
      "lineCount": 60,
      "tables": [
        "api_idempotency_keys"
      ],
      "functions": [],
      "policies": [],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260527001000_api_idempotency_keys.sql",
          "line": 8,
          "text": "CREATE TABLE IF NOT EXISTS public.api_idempotency_keys ("
        },
        {
          "file": "supabase/migrations/20260527001000_api_idempotency_keys.sql",
          "line": 56,
          "text": "ALTER TABLE public.api_idempotency_keys ENABLE ROW LEVEL SECURITY;"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260527002000_workspace_cloud_state.sql",
      "lineCount": 206,
      "tables": [
        "workspace_snapshots",
        "workspace_state_entities"
      ],
      "functions": [
        "set_updated_at"
      ],
      "policies": [
        "workspace_snapshots_insert_editor",
        "workspace_snapshots_select_member",
        "workspace_snapshots_update_editor",
        "workspace_state_entities_delete_editor",
        "workspace_state_entities_insert_editor",
        "workspace_state_entities_select_member",
        "workspace_state_entities_update_editor"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260527002000_workspace_cloud_state.sql",
          "line": 10,
          "text": "CREATE TABLE IF NOT EXISTS public.workspace_snapshots ("
        },
        {
          "file": "supabase/migrations/20260527002000_workspace_cloud_state.sql",
          "line": 41,
          "text": "CREATE TABLE IF NOT EXISTS public.workspace_state_entities ("
        },
        {
          "file": "supabase/migrations/20260527002000_workspace_cloud_state.sql",
          "line": 65,
          "text": "CREATE OR REPLACE FUNCTION public.set_updated_at()"
        },
        {
          "file": "supabase/migrations/20260527002000_workspace_cloud_state.sql",
          "line": 99,
          "text": "ALTER TABLE public.workspace_snapshots ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260527002000_workspace_cloud_state.sql",
          "line": 100,
          "text": "ALTER TABLE public.workspace_state_entities ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260527002000_workspace_cloud_state.sql",
          "line": 110,
          "text": "CREATE POLICY workspace_snapshots_select_member"
        },
        {
          "file": "supabase/migrations/20260527002000_workspace_cloud_state.sql",
          "line": 123,
          "text": "CREATE POLICY workspace_snapshots_insert_editor"
        },
        {
          "file": "supabase/migrations/20260527002000_workspace_cloud_state.sql",
          "line": 139,
          "text": "CREATE POLICY workspace_snapshots_update_editor"
        },
        {
          "file": "supabase/migrations/20260527002000_workspace_cloud_state.sql",
          "line": 153,
          "text": "CREATE POLICY workspace_state_entities_select_member"
        },
        {
          "file": "supabase/migrations/20260527002000_workspace_cloud_state.sql",
          "line": 166,
          "text": "CREATE POLICY workspace_state_entities_insert_editor"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260527003000_durable_sync_queue.sql",
      "lineCount": 128,
      "tables": [
        "sync_operations"
      ],
      "functions": [],
      "policies": [
        "sync_operations_insert_editor",
        "sync_operations_select_member",
        "sync_operations_update_editor"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260527003000_durable_sync_queue.sql",
          "line": 9,
          "text": "CREATE TABLE IF NOT EXISTS public.sync_operations ("
        },
        {
          "file": "supabase/migrations/20260527003000_durable_sync_queue.sql",
          "line": 78,
          "text": "ALTER TABLE public.sync_operations ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260527003000_durable_sync_queue.sql",
          "line": 88,
          "text": "CREATE POLICY sync_operations_select_member"
        },
        {
          "file": "supabase/migrations/20260527003000_durable_sync_queue.sql",
          "line": 101,
          "text": "CREATE POLICY sync_operations_insert_editor"
        },
        {
          "file": "supabase/migrations/20260527003000_durable_sync_queue.sql",
          "line": 117,
          "text": "CREATE POLICY sync_operations_update_editor"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260527004000_deployment_safety_gate.sql",
      "lineCount": 138,
      "tables": [
        "deployment_checks",
        "feature_flags"
      ],
      "functions": [],
      "policies": [
        "feature_flags_insert_workspace_admin",
        "feature_flags_select_visible_scope",
        "feature_flags_update_workspace_admin"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260527004000_deployment_safety_gate.sql",
          "line": 10,
          "text": "CREATE TABLE IF NOT EXISTS public.feature_flags ("
        },
        {
          "file": "supabase/migrations/20260527004000_deployment_safety_gate.sql",
          "line": 32,
          "text": "CREATE TABLE IF NOT EXISTS public.deployment_checks ("
        },
        {
          "file": "supabase/migrations/20260527004000_deployment_safety_gate.sql",
          "line": 71,
          "text": "ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260527004000_deployment_safety_gate.sql",
          "line": 72,
          "text": "ALTER TABLE public.deployment_checks ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260527004000_deployment_safety_gate.sql",
          "line": 82,
          "text": "CREATE POLICY feature_flags_select_visible_scope"
        },
        {
          "file": "supabase/migrations/20260527004000_deployment_safety_gate.sql",
          "line": 98,
          "text": "CREATE POLICY feature_flags_insert_workspace_admin"
        },
        {
          "file": "supabase/migrations/20260527004000_deployment_safety_gate.sql",
          "line": 114,
          "text": "CREATE POLICY feature_flags_update_workspace_admin"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260527005000_agent_runtime_sessions.sql",
      "lineCount": 229,
      "tables": [
        "agent_runtime_events",
        "agent_runtime_sessions",
        "agent_tasks"
      ],
      "functions": [],
      "policies": [
        "agent_runtime_events_select_member",
        "agent_runtime_sessions_insert_editor",
        "agent_runtime_sessions_select_member",
        "agent_runtime_sessions_update_editor",
        "agent_tasks_insert_editor",
        "agent_tasks_select_member",
        "agent_tasks_update_editor"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260527005000_agent_runtime_sessions.sql",
          "line": 10,
          "text": "CREATE TABLE IF NOT EXISTS public.agent_runtime_sessions ("
        },
        {
          "file": "supabase/migrations/20260527005000_agent_runtime_sessions.sql",
          "line": 35,
          "text": "CREATE TABLE IF NOT EXISTS public.agent_tasks ("
        },
        {
          "file": "supabase/migrations/20260527005000_agent_runtime_sessions.sql",
          "line": 78,
          "text": "CREATE TABLE IF NOT EXISTS public.agent_runtime_events ("
        },
        {
          "file": "supabase/migrations/20260527005000_agent_runtime_sessions.sql",
          "line": 111,
          "text": "ALTER TABLE public.agent_runtime_sessions ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260527005000_agent_runtime_sessions.sql",
          "line": 112,
          "text": "ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260527005000_agent_runtime_sessions.sql",
          "line": 113,
          "text": "ALTER TABLE public.agent_runtime_events ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260527005000_agent_runtime_sessions.sql",
          "line": 123,
          "text": "CREATE POLICY agent_runtime_sessions_select_member"
        },
        {
          "file": "supabase/migrations/20260527005000_agent_runtime_sessions.sql",
          "line": 136,
          "text": "CREATE POLICY agent_runtime_sessions_insert_editor"
        },
        {
          "file": "supabase/migrations/20260527005000_agent_runtime_sessions.sql",
          "line": 152,
          "text": "CREATE POLICY agent_runtime_sessions_update_editor"
        },
        {
          "file": "supabase/migrations/20260527005000_agent_runtime_sessions.sql",
          "line": 166,
          "text": "CREATE POLICY agent_tasks_select_member"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260527006000_tool_execution_control_plane.sql",
      "lineCount": 195,
      "tables": [
        "tool_permissions",
        "tool_runs"
      ],
      "functions": [],
      "policies": [
        "tool_permissions_insert_admin",
        "tool_permissions_select_member",
        "tool_permissions_update_admin",
        "tool_runs_insert_operator",
        "tool_runs_select_member",
        "tool_runs_update_operator"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260527006000_tool_execution_control_plane.sql",
          "line": 10,
          "text": "CREATE TABLE IF NOT EXISTS public.tool_runs ("
        },
        {
          "file": "supabase/migrations/20260527006000_tool_execution_control_plane.sql",
          "line": 62,
          "text": "CREATE TABLE IF NOT EXISTS public.tool_permissions ("
        },
        {
          "file": "supabase/migrations/20260527006000_tool_execution_control_plane.sql",
          "line": 98,
          "text": "ALTER TABLE public.tool_runs ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260527006000_tool_execution_control_plane.sql",
          "line": 99,
          "text": "ALTER TABLE public.tool_permissions ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260527006000_tool_execution_control_plane.sql",
          "line": 109,
          "text": "CREATE POLICY tool_runs_select_member"
        },
        {
          "file": "supabase/migrations/20260527006000_tool_execution_control_plane.sql",
          "line": 122,
          "text": "CREATE POLICY tool_runs_insert_operator"
        },
        {
          "file": "supabase/migrations/20260527006000_tool_execution_control_plane.sql",
          "line": 138,
          "text": "CREATE POLICY tool_runs_update_operator"
        },
        {
          "file": "supabase/migrations/20260527006000_tool_execution_control_plane.sql",
          "line": 152,
          "text": "CREATE POLICY tool_permissions_select_member"
        },
        {
          "file": "supabase/migrations/20260527006000_tool_execution_control_plane.sql",
          "line": 165,
          "text": "CREATE POLICY tool_permissions_insert_admin"
        },
        {
          "file": "supabase/migrations/20260527006000_tool_execution_control_plane.sql",
          "line": 178,
          "text": "CREATE POLICY tool_permissions_update_admin"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260527007000_artifact_asset_layer.sql",
      "lineCount": 240,
      "tables": [
        "artifact_references",
        "artifacts"
      ],
      "functions": [],
      "policies": [
        "artifact_references_delete_editor",
        "artifact_references_insert_editor",
        "artifact_references_select_member"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260527007000_artifact_asset_layer.sql",
          "line": 10,
          "text": "CREATE TABLE IF NOT EXISTS public.artifacts ("
        },
        {
          "file": "supabase/migrations/20260527007000_artifact_asset_layer.sql",
          "line": 23,
          "text": "ALTER TABLE public.artifacts"
        },
        {
          "file": "supabase/migrations/20260527007000_artifact_asset_layer.sql",
          "line": 45,
          "text": "ALTER TABLE public.artifacts"
        },
        {
          "file": "supabase/migrations/20260527007000_artifact_asset_layer.sql",
          "line": 62,
          "text": "ALTER TABLE public.artifacts"
        },
        {
          "file": "supabase/migrations/20260527007000_artifact_asset_layer.sql",
          "line": 71,
          "text": "ALTER TABLE public.artifacts"
        },
        {
          "file": "supabase/migrations/20260527007000_artifact_asset_layer.sql",
          "line": 82,
          "text": "ALTER TABLE public.artifacts"
        },
        {
          "file": "supabase/migrations/20260527007000_artifact_asset_layer.sql",
          "line": 95,
          "text": "ALTER TABLE public.artifacts"
        },
        {
          "file": "supabase/migrations/20260527007000_artifact_asset_layer.sql",
          "line": 106,
          "text": "ALTER TABLE public.artifacts"
        },
        {
          "file": "supabase/migrations/20260527007000_artifact_asset_layer.sql",
          "line": 117,
          "text": "ALTER TABLE public.artifacts"
        },
        {
          "file": "supabase/migrations/20260527007000_artifact_asset_layer.sql",
          "line": 162,
          "text": "CREATE TABLE IF NOT EXISTS public.artifact_references ("
        }
      ]
    },
    {
      "file": "supabase/migrations/20260527008000_observability_event_spine.sql",
      "lineCount": 128,
      "tables": [
        "system_events",
        "usage_metrics"
      ],
      "functions": [],
      "policies": [
        "system_events_select_member",
        "usage_metrics_select_member"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260527008000_observability_event_spine.sql",
          "line": 10,
          "text": "CREATE TABLE IF NOT EXISTS public.system_events ("
        },
        {
          "file": "supabase/migrations/20260527008000_observability_event_spine.sql",
          "line": 53,
          "text": "CREATE TABLE IF NOT EXISTS public.usage_metrics ("
        },
        {
          "file": "supabase/migrations/20260527008000_observability_event_spine.sql",
          "line": 85,
          "text": "ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260527008000_observability_event_spine.sql",
          "line": 86,
          "text": "ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260527008000_observability_event_spine.sql",
          "line": 96,
          "text": "CREATE POLICY system_events_select_member"
        },
        {
          "file": "supabase/migrations/20260527008000_observability_event_spine.sql",
          "line": 112,
          "text": "CREATE POLICY usage_metrics_select_member"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260527009000_historical_data_paging.sql",
      "lineCount": 254,
      "tables": [
        "agent_memory_records",
        "messages"
      ],
      "functions": [
        "backfill_message_history_fields"
      ],
      "policies": [
        "agent_memory_records_select_member",
        "agent_memory_records_write_editor"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260527009000_historical_data_paging.sql",
          "line": 12,
          "text": "ALTER TABLE public.messages"
        },
        {
          "file": "supabase/migrations/20260527009000_historical_data_paging.sql",
          "line": 27,
          "text": "ALTER TABLE public.messages"
        },
        {
          "file": "supabase/migrations/20260527009000_historical_data_paging.sql",
          "line": 36,
          "text": "ALTER TABLE public.messages"
        },
        {
          "file": "supabase/migrations/20260527009000_historical_data_paging.sql",
          "line": 47,
          "text": "ALTER TABLE public.messages"
        },
        {
          "file": "supabase/migrations/20260527009000_historical_data_paging.sql",
          "line": 60,
          "text": "ALTER TABLE public.messages"
        },
        {
          "file": "supabase/migrations/20260527009000_historical_data_paging.sql",
          "line": 104,
          "text": "CREATE TABLE IF NOT EXISTS public.agent_memory_records ("
        },
        {
          "file": "supabase/migrations/20260527009000_historical_data_paging.sql",
          "line": 129,
          "text": "ALTER TABLE public.agent_memory_records"
        },
        {
          "file": "supabase/migrations/20260527009000_historical_data_paging.sql",
          "line": 159,
          "text": "ALTER TABLE public.agent_memory_records ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260527009000_historical_data_paging.sql",
          "line": 169,
          "text": "CREATE POLICY agent_memory_records_select_member"
        },
        {
          "file": "supabase/migrations/20260527009000_historical_data_paging.sql",
          "line": 182,
          "text": "CREATE POLICY agent_memory_records_write_editor"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260527010000_notebook_durable_tombstones.sql",
      "lineCount": 223,
      "tables": [
        "notebooks"
      ],
      "functions": [
        "set_updated_at"
      ],
      "policies": [
        "notebooks_delete_workspace_editor",
        "notebooks_insert_workspace_editor",
        "notebooks_select_workspace_member",
        "notebooks_update_workspace_editor"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260527010000_notebook_durable_tombstones.sql",
          "line": 8,
          "text": "CREATE TABLE IF NOT EXISTS public.notebooks ("
        },
        {
          "file": "supabase/migrations/20260527010000_notebook_durable_tombstones.sql",
          "line": 30,
          "text": "ALTER TABLE public.notebooks"
        },
        {
          "file": "supabase/migrations/20260527010000_notebook_durable_tombstones.sql",
          "line": 46,
          "text": "ALTER TABLE public.notebooks"
        },
        {
          "file": "supabase/migrations/20260527010000_notebook_durable_tombstones.sql",
          "line": 55,
          "text": "ALTER TABLE public.notebooks"
        },
        {
          "file": "supabase/migrations/20260527010000_notebook_durable_tombstones.sql",
          "line": 64,
          "text": "ALTER TABLE public.notebooks"
        },
        {
          "file": "supabase/migrations/20260527010000_notebook_durable_tombstones.sql",
          "line": 73,
          "text": "ALTER TABLE public.notebooks"
        },
        {
          "file": "supabase/migrations/20260527010000_notebook_durable_tombstones.sql",
          "line": 82,
          "text": "ALTER TABLE public.notebooks"
        },
        {
          "file": "supabase/migrations/20260527010000_notebook_durable_tombstones.sql",
          "line": 91,
          "text": "ALTER TABLE public.notebooks"
        },
        {
          "file": "supabase/migrations/20260527010000_notebook_durable_tombstones.sql",
          "line": 110,
          "text": "ALTER TABLE public.notebooks"
        },
        {
          "file": "supabase/migrations/20260527010000_notebook_durable_tombstones.sql",
          "line": 113,
          "text": "CREATE OR REPLACE FUNCTION public.set_updated_at()"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260527011000_prompt_durable_tombstones.sql",
      "lineCount": 104,
      "tables": [
        "prompts"
      ],
      "functions": [],
      "policies": [
        "prompts_delete_workspace_editor",
        "prompts_insert_workspace_editor",
        "prompts_select_workspace_member",
        "prompts_update_workspace_editor"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260527011000_prompt_durable_tombstones.sql",
          "line": 6,
          "text": "CREATE TABLE IF NOT EXISTS public.prompts ("
        },
        {
          "file": "supabase/migrations/20260527011000_prompt_durable_tombstones.sql",
          "line": 24,
          "text": "ALTER TABLE public.prompts"
        },
        {
          "file": "supabase/migrations/20260527011000_prompt_durable_tombstones.sql",
          "line": 55,
          "text": "ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260527011000_prompt_durable_tombstones.sql",
          "line": 62,
          "text": "CREATE POLICY prompts_select_workspace_member"
        },
        {
          "file": "supabase/migrations/20260527011000_prompt_durable_tombstones.sql",
          "line": 71,
          "text": "CREATE POLICY prompts_insert_workspace_editor"
        },
        {
          "file": "supabase/migrations/20260527011000_prompt_durable_tombstones.sql",
          "line": 80,
          "text": "CREATE POLICY prompts_update_workspace_editor"
        },
        {
          "file": "supabase/migrations/20260527011000_prompt_durable_tombstones.sql",
          "line": 93,
          "text": "CREATE POLICY prompts_delete_workspace_editor"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260527012000_message_history_base_table.sql",
      "lineCount": 221,
      "tables": [
        "messages"
      ],
      "functions": [],
      "policies": [
        "messages_delete_workspace_editor",
        "messages_insert_workspace_editor",
        "messages_select_workspace_member",
        "messages_update_workspace_editor"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260527012000_message_history_base_table.sql",
          "line": 10,
          "text": "CREATE TABLE IF NOT EXISTS public.messages ("
        },
        {
          "file": "supabase/migrations/20260527012000_message_history_base_table.sql",
          "line": 37,
          "text": "ALTER TABLE public.messages"
        },
        {
          "file": "supabase/migrations/20260527012000_message_history_base_table.sql",
          "line": 54,
          "text": "ALTER TABLE public.messages"
        },
        {
          "file": "supabase/migrations/20260527012000_message_history_base_table.sql",
          "line": 69,
          "text": "ALTER TABLE public.messages"
        },
        {
          "file": "supabase/migrations/20260527012000_message_history_base_table.sql",
          "line": 80,
          "text": "ALTER TABLE public.messages"
        },
        {
          "file": "supabase/migrations/20260527012000_message_history_base_table.sql",
          "line": 91,
          "text": "ALTER TABLE public.messages"
        },
        {
          "file": "supabase/migrations/20260527012000_message_history_base_table.sql",
          "line": 102,
          "text": "ALTER TABLE public.messages"
        },
        {
          "file": "supabase/migrations/20260527012000_message_history_base_table.sql",
          "line": 115,
          "text": "ALTER TABLE public.messages"
        },
        {
          "file": "supabase/migrations/20260527012000_message_history_base_table.sql",
          "line": 129,
          "text": "ALTER TABLE public.messages"
        },
        {
          "file": "supabase/migrations/20260527012000_message_history_base_table.sql",
          "line": 166,
          "text": "ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260527013000_prompt_revision_history.sql",
      "lineCount": 116,
      "tables": [
        "prompt_revisions"
      ],
      "functions": [],
      "policies": [
        "prompt_revisions_insert_workspace_editor",
        "prompt_revisions_select_workspace_member",
        "prompt_revisions_update_workspace_editor"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260527013000_prompt_revision_history.sql",
          "line": 9,
          "text": "CREATE TABLE IF NOT EXISTS public.prompt_revisions ("
        },
        {
          "file": "supabase/migrations/20260527013000_prompt_revision_history.sql",
          "line": 19,
          "text": "ALTER TABLE public.prompt_revisions"
        },
        {
          "file": "supabase/migrations/20260527013000_prompt_revision_history.sql",
          "line": 25,
          "text": "ALTER TABLE public.prompt_revisions"
        },
        {
          "file": "supabase/migrations/20260527013000_prompt_revision_history.sql",
          "line": 39,
          "text": "ALTER TABLE public.prompt_revisions"
        },
        {
          "file": "supabase/migrations/20260527013000_prompt_revision_history.sql",
          "line": 51,
          "text": "ALTER TABLE public.prompt_revisions"
        },
        {
          "file": "supabase/migrations/20260527013000_prompt_revision_history.sql",
          "line": 61,
          "text": "ALTER TABLE public.prompt_revisions ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260527013000_prompt_revision_history.sql",
          "line": 67,
          "text": "CREATE POLICY prompt_revisions_select_workspace_member"
        },
        {
          "file": "supabase/migrations/20260527013000_prompt_revision_history.sql",
          "line": 80,
          "text": "CREATE POLICY prompt_revisions_insert_workspace_editor"
        },
        {
          "file": "supabase/migrations/20260527013000_prompt_revision_history.sql",
          "line": 93,
          "text": "CREATE POLICY prompt_revisions_update_workspace_editor"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260529001000_artifacts_tool_runs_live_parity.sql",
      "lineCount": 385,
      "tables": [
        "artifacts",
        "tool_permissions",
        "tool_runs"
      ],
      "functions": [],
      "policies": [
        "artifacts_insert_workspace_editor",
        "artifacts_select_workspace_member",
        "artifacts_update_workspace_editor",
        "tool_permissions_insert_admin",
        "tool_permissions_select_member",
        "tool_permissions_update_admin",
        "tool_runs_insert_operator",
        "tool_runs_select_member",
        "tool_runs_update_operator"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260529001000_artifacts_tool_runs_live_parity.sql",
          "line": 9,
          "text": "CREATE TABLE IF NOT EXISTS public.tool_runs ("
        },
        {
          "file": "supabase/migrations/20260529001000_artifacts_tool_runs_live_parity.sql",
          "line": 61,
          "text": "CREATE TABLE IF NOT EXISTS public.tool_permissions ("
        },
        {
          "file": "supabase/migrations/20260529001000_artifacts_tool_runs_live_parity.sql",
          "line": 77,
          "text": "CREATE TABLE IF NOT EXISTS public.artifacts ("
        },
        {
          "file": "supabase/migrations/20260529001000_artifacts_tool_runs_live_parity.sql",
          "line": 87,
          "text": "ALTER TABLE public.artifacts"
        },
        {
          "file": "supabase/migrations/20260529001000_artifacts_tool_runs_live_parity.sql",
          "line": 110,
          "text": "ALTER TABLE public.artifacts"
        },
        {
          "file": "supabase/migrations/20260529001000_artifacts_tool_runs_live_parity.sql",
          "line": 127,
          "text": "ALTER TABLE public.artifacts"
        },
        {
          "file": "supabase/migrations/20260529001000_artifacts_tool_runs_live_parity.sql",
          "line": 136,
          "text": "ALTER TABLE public.artifacts"
        },
        {
          "file": "supabase/migrations/20260529001000_artifacts_tool_runs_live_parity.sql",
          "line": 147,
          "text": "ALTER TABLE public.artifacts"
        },
        {
          "file": "supabase/migrations/20260529001000_artifacts_tool_runs_live_parity.sql",
          "line": 158,
          "text": "ALTER TABLE public.artifacts"
        },
        {
          "file": "supabase/migrations/20260529001000_artifacts_tool_runs_live_parity.sql",
          "line": 169,
          "text": "ALTER TABLE public.artifacts"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260601001000_v20_auth_boundary_rls_hardening.sql",
      "lineCount": 98,
      "tables": [
        "api_idempotency_keys",
        "permission_audit_logs",
        "workspaces"
      ],
      "functions": [],
      "policies": [
        "workspaces_insert_owner",
        "workspaces_update_editor"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260601001000_v20_auth_boundary_rls_hardening.sql",
          "line": 18,
          "text": "ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260601001000_v20_auth_boundary_rls_hardening.sql",
          "line": 23,
          "text": "CREATE POLICY workspaces_insert_owner"
        },
        {
          "file": "supabase/migrations/20260601001000_v20_auth_boundary_rls_hardening.sql",
          "line": 35,
          "text": "CREATE POLICY workspaces_update_editor"
        },
        {
          "file": "supabase/migrations/20260601001000_v20_auth_boundary_rls_hardening.sql",
          "line": 55,
          "text": "ALTER TABLE public.api_idempotency_keys ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260601001000_v20_auth_boundary_rls_hardening.sql",
          "line": 77,
          "text": "ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260601002000_v20_client_grant_hardening.sql",
      "lineCount": 58,
      "tables": [],
      "functions": [],
      "policies": [],
      "enablesRlsSignal": false,
      "storageSignals": [],
      "evidence": []
    },
    {
      "file": "supabase/migrations/20260601003000_v20_schema_live_parity_repair.sql",
      "lineCount": 262,
      "tables": [
        "agent_memory_records",
        "deployment_checks",
        "feature_flags"
      ],
      "functions": [],
      "policies": [
        "agent_memory_records_select_member",
        "agent_memory_records_write_editor",
        "feature_flags_insert_workspace_admin",
        "feature_flags_select_visible_scope",
        "feature_flags_update_workspace_admin"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260601003000_v20_schema_live_parity_repair.sql",
          "line": 9,
          "text": "CREATE TABLE IF NOT EXISTS public.feature_flags ("
        },
        {
          "file": "supabase/migrations/20260601003000_v20_schema_live_parity_repair.sql",
          "line": 31,
          "text": "CREATE TABLE IF NOT EXISTS public.deployment_checks ("
        },
        {
          "file": "supabase/migrations/20260601003000_v20_schema_live_parity_repair.sql",
          "line": 56,
          "text": "CREATE TABLE IF NOT EXISTS public.agent_memory_records ("
        },
        {
          "file": "supabase/migrations/20260601003000_v20_schema_live_parity_repair.sql",
          "line": 82,
          "text": "ALTER TABLE public.agent_memory_records"
        },
        {
          "file": "supabase/migrations/20260601003000_v20_schema_live_parity_repair.sql",
          "line": 157,
          "text": "ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260601003000_v20_schema_live_parity_repair.sql",
          "line": 158,
          "text": "ALTER TABLE public.deployment_checks ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260601003000_v20_schema_live_parity_repair.sql",
          "line": 159,
          "text": "ALTER TABLE public.agent_memory_records ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260601003000_v20_schema_live_parity_repair.sql",
          "line": 169,
          "text": "CREATE POLICY feature_flags_select_visible_scope"
        },
        {
          "file": "supabase/migrations/20260601003000_v20_schema_live_parity_repair.sql",
          "line": 185,
          "text": "CREATE POLICY feature_flags_insert_workspace_admin"
        },
        {
          "file": "supabase/migrations/20260601003000_v20_schema_live_parity_repair.sql",
          "line": 201,
          "text": "CREATE POLICY feature_flags_update_workspace_admin"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260601004000_v20_schema_live_parity_grant_tightening.sql",
      "lineCount": 20,
      "tables": [],
      "functions": [],
      "policies": [],
      "enablesRlsSignal": false,
      "storageSignals": [],
      "evidence": []
    },
    {
      "file": "supabase/migrations/20260603001000_v22_rls_policy_performance_hardening.sql",
      "lineCount": 97,
      "tables": [
        "agent_memory_records",
        "agent_runtime_sessions",
        "tool_runs"
      ],
      "functions": [],
      "policies": [
        "agent_memory_records_delete_editor",
        "agent_memory_records_insert_editor",
        "agent_memory_records_select_member",
        "agent_memory_records_update_editor",
        "agent_runtime_sessions_insert_editor",
        "tool_runs_insert_operator"
      ],
      "enablesRlsSignal": true,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260603001000_v22_rls_policy_performance_hardening.sql",
          "line": 12,
          "text": "ALTER TABLE public.agent_runtime_sessions ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260603001000_v22_rls_policy_performance_hardening.sql",
          "line": 17,
          "text": "CREATE POLICY agent_runtime_sessions_insert_editor"
        },
        {
          "file": "supabase/migrations/20260603001000_v22_rls_policy_performance_hardening.sql",
          "line": 28,
          "text": "ALTER TABLE public.tool_runs ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260603001000_v22_rls_policy_performance_hardening.sql",
          "line": 33,
          "text": "CREATE POLICY tool_runs_insert_operator"
        },
        {
          "file": "supabase/migrations/20260603001000_v22_rls_policy_performance_hardening.sql",
          "line": 44,
          "text": "ALTER TABLE public.agent_memory_records ENABLE ROW LEVEL SECURITY;"
        },
        {
          "file": "supabase/migrations/20260603001000_v22_rls_policy_performance_hardening.sql",
          "line": 53,
          "text": "CREATE POLICY agent_memory_records_select_member"
        },
        {
          "file": "supabase/migrations/20260603001000_v22_rls_policy_performance_hardening.sql",
          "line": 69,
          "text": "CREATE POLICY agent_memory_records_insert_editor"
        },
        {
          "file": "supabase/migrations/20260603001000_v22_rls_policy_performance_hardening.sql",
          "line": 77,
          "text": "CREATE POLICY agent_memory_records_update_editor"
        },
        {
          "file": "supabase/migrations/20260603001000_v22_rls_policy_performance_hardening.sql",
          "line": 88,
          "text": "CREATE POLICY agent_memory_records_delete_editor"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260603002000_v22_workspace_session_rpc.sql",
      "lineCount": 173,
      "tables": [],
      "functions": [
        "nexus_ensure_workspace_session"
      ],
      "policies": [],
      "enablesRlsSignal": false,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260603002000_v22_workspace_session_rpc.sql",
          "line": 10,
          "text": "CREATE OR REPLACE FUNCTION public.nexus_ensure_workspace_session("
        }
      ]
    },
    {
      "file": "supabase/migrations/20260604081500_v22_workspace_session_viewer_readable.sql",
      "lineCount": 172,
      "tables": [],
      "functions": [
        "nexus_ensure_workspace_session"
      ],
      "policies": [],
      "enablesRlsSignal": false,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260604081500_v22_workspace_session_viewer_readable.sql",
          "line": 9,
          "text": "CREATE OR REPLACE FUNCTION public.nexus_ensure_workspace_session("
        }
      ]
    },
    {
      "file": "supabase/migrations/20260604093000_v22_generated_image_storage.sql",
      "lineCount": 108,
      "tables": [],
      "functions": [],
      "policies": [
        "nexus_generated_assets_delete_editor",
        "nexus_generated_assets_insert_editor",
        "nexus_generated_assets_select_member",
        "nexus_generated_assets_update_editor"
      ],
      "enablesRlsSignal": false,
      "storageSignals": [
        "nexus-generated-assets"
      ],
      "evidence": [
        {
          "file": "supabase/migrations/20260604093000_v22_generated_image_storage.sql",
          "line": 9,
          "text": "INSERT INTO storage.buckets ("
        },
        {
          "file": "supabase/migrations/20260604093000_v22_generated_image_storage.sql",
          "line": 43,
          "text": "CREATE POLICY nexus_generated_assets_select_member"
        },
        {
          "file": "supabase/migrations/20260604093000_v22_generated_image_storage.sql",
          "line": 48,
          "text": "bucket_id = 'nexus-generated-assets'"
        },
        {
          "file": "supabase/migrations/20260604093000_v22_generated_image_storage.sql",
          "line": 60,
          "text": "CREATE POLICY nexus_generated_assets_insert_editor"
        },
        {
          "file": "supabase/migrations/20260604093000_v22_generated_image_storage.sql",
          "line": 65,
          "text": "bucket_id = 'nexus-generated-assets'"
        },
        {
          "file": "supabase/migrations/20260604093000_v22_generated_image_storage.sql",
          "line": 77,
          "text": "CREATE POLICY nexus_generated_assets_update_editor"
        },
        {
          "file": "supabase/migrations/20260604093000_v22_generated_image_storage.sql",
          "line": 82,
          "text": "bucket_id = 'nexus-generated-assets'"
        },
        {
          "file": "supabase/migrations/20260604093000_v22_generated_image_storage.sql",
          "line": 86,
          "text": "bucket_id = 'nexus-generated-assets'"
        },
        {
          "file": "supabase/migrations/20260604093000_v22_generated_image_storage.sql",
          "line": 98,
          "text": "CREATE POLICY nexus_generated_assets_delete_editor"
        },
        {
          "file": "supabase/migrations/20260604093000_v22_generated_image_storage.sql",
          "line": 103,
          "text": "bucket_id = 'nexus-generated-assets'"
        }
      ]
    },
    {
      "file": "supabase/migrations/20260604102000_v22_request_scoped_permission_audit_rpc.sql",
      "lineCount": 86,
      "tables": [],
      "functions": [
        "record_permission_audit_log"
      ],
      "policies": [],
      "enablesRlsSignal": false,
      "storageSignals": [],
      "evidence": [
        {
          "file": "supabase/migrations/20260604102000_v22_request_scoped_permission_audit_rpc.sql",
          "line": 1,
          "text": "CREATE OR REPLACE FUNCTION public.record_permission_audit_log("
        }
      ]
    }
  ],
  "aggregate": {
    "tables": [
      "agent_memory_records",
      "agent_runtime_events",
      "agent_runtime_sessions",
      "agent_tasks",
      "api_idempotency_keys",
      "artifact_references",
      "artifacts",
      "deployment_checks",
      "feature_flags",
      "messages",
      "notebooks",
      "permission_audit_logs",
      "prompt_revisions",
      "prompts",
      "sync_operations",
      "system_events",
      "tool_permissions",
      "tool_runs",
      "usage_metrics",
      "workflow_templates",
      "workspace_memberships",
      "workspace_snapshots",
      "workspace_state_entities",
      "workspaces"
    ],
    "rpcsOrFunctions": [
      "backfill_message_history_fields",
      "has_workspace_role",
      "is_workspace_member",
      "nexus_ensure_workspace_session",
      "record_permission_audit_log",
      "set_updated_at"
    ],
    "storage": [
      "nexus-generated-assets"
    ],
    "envVarNames": [
      "NEXTAUTH_SECRET",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY"
    ]
  }
}
```

## Raw API Shape

The raw source API JSON is saved under `_raw-source-api/` for audit. It is metadata-only for this notebook source in the current API response.
