# A3 Artifact Storage Policy And Retrieval Contract

## Purpose

Verify that generated artifacts, image assets, file attachments, and large text
outputs have retrievable storage authority, not only local cache, previews, or
placeholder URLs.

Score target: 89 / 100.

## Asset Classes

- inline text artifact
- oversized text artifact
- generated image asset
- media URL reference
- attachment compiler output
- generated history record
- workflow group output package

## Execution Phases

1. Inventory artifact and generated asset routes.
2. Inventory artifact repository, materializer, storage helper, and generated
   image storage code.
3. Map each asset class to table, blob/bucket path, signed route, hash, and
   read API.
4. Verify live schema and bucket policy when available.
5. Run tests for inline and oversized assets.
6. Verify browser download/read behavior when safe.
7. Produce an artifact storage contract matrix.

## Contract Matrix

| Asset | Producer | Stored Body | Pointer | Hash | Blob/Bucket | Read Route | Recovery | Verdict |
|---|---|---|---|---|---|---|---|---|

## Required Scans

```bash
rg -n "artifact|content_text|content_url|content_hash|preview_text|bucket|storage|signed|generated-image|image-gen|external://|inline://" src supabase scripts
npm test -- src/lib/backend/artifacts src/app/api/image-gen
```

## Tool Guidance

- Supabase: inspect table columns, storage policies, bucket metadata, and counts.
- Browser/Chrome: verify download/read routes without exporting secrets.
- Vercel: verify deployed asset route behavior when needed.

## API Key Policy

Real image/provider tests may run when configured. Do not put raw API keys or
provider tokens in storage contract reports.

## Evidence Weighting

- W1 repository/materializer/route proof
- W2 artifact/image tests
- W3 live schema/storage policy checks
- W4 browser download or API retrieval proof

## Contradiction Pass

Check:

- Does any artifact URL point to a non-retrievable placeholder?
- Does any route return metadata without bytes?
- Does any hash exist without a matching byte source?
- Does browser download use the same authority as backend recovery?

## Output Format

```md
# Artifact Storage Policy And Retrieval Report
## Scope
## Asset Inventory
## Storage Contract Matrix
## Live Schema And Bucket Checks
## Retrieval Tests
## Gap Table
## Repair Plan
## Test Gates
```

## Completion Gate

Complete only when every generated asset class has either retrievable body proof
or an explicit non-durable verdict.

## Execution Prompt

```txt
Read docs/workflow-pro/v23-debug-protocols/A3-artifact-storage-policy-retrieval-contract.md first.
Audit artifact and generated asset storage/retrieval. Use available tools safely.
Produce a storage contract matrix and markdown report. Do not rely on prior
context and do not copy secrets.
```

