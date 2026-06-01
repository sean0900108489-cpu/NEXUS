-- V20 historical workflow output metadata-only remediation.
--
-- Authorized live DML on 2026-06-01.
-- Scope: completed workflow-runtime chat tasks that have no strict durable
-- messages join, have proven stream lifecycle evidence, and have no exact
-- content authority candidate.
--
-- Safety contract:
-- - updates only public.agent_tasks.metadata
-- - does not update messages
-- - does not backfill content
-- - does not change task status
-- - returns redacted hashes only
-- - is idempotent; rerun should update 0 rows after first application

with completed_output_tasks as (
  select
    t.id,
    t.workspace_id,
    t.agent_id,
    t.output_message_id,
    t.status,
    t.error_code,
    t.metadata
  from public.agent_tasks t
  where t.status = 'completed'
    and t.task_type = 'chat'
    and t.output_message_id is not null
    and t.output_message_id like '%:%:output'
),
missing as (
  select t.*
  from completed_output_tasks t
  left join public.messages m
    on m.id = t.output_message_id
   and m.workspace_id = t.workspace_id
   and coalesce(m.agent_id, '') = coalesce(t.agent_id, '')
   and m.task_id = t.id
  where m.id is null
),
event_flags as (
  select
    m.id,
    bool_or(e.event_type = 'stream_started') as has_stream_started,
    bool_or(e.event_type = 'first_token') as has_first_token,
    bool_or(e.event_type = 'stream_completed') as has_stream_completed,
    bool_or(e.event_type = 'stream_failed') as has_stream_failed,
    min(e.created_at) filter (where e.event_type = 'stream_started') as stream_started_at,
    min(e.created_at) filter (where e.event_type = 'first_token') as first_token_at,
    max(e.created_at) filter (where e.event_type = 'stream_completed') as stream_completed_at,
    count(e.*) as runtime_event_count
  from missing m
  left join public.agent_runtime_events e on e.task_id = m.id
  group by m.id
),
candidate_sources as (
  select
    m.id,
    exists (
      select 1 from public.messages any_msg where any_msg.id = m.output_message_id
    ) as any_message_id_match,
    exists (
      select 1
      from public.workspace_snapshots s
      where s.workspace_id = m.workspace_id
        and s.payload::text like '%' || m.output_message_id || '%'
    ) as snapshot_references_output_id,
    exists (
      select 1
      from public.sync_operations so
      where so.workspace_id = m.workspace_id
        and so.payload::text like '%' || m.output_message_id || '%'
    ) as sync_references_output_id,
    exists (
      select 1
      from public.agent_runtime_events e
      where e.task_id = m.id
        and e.payload::text like '%' || m.output_message_id || '%'
    ) as runtime_event_references_output_id,
    exists (
      select 1
      from public.system_events se
      where se.resource_id = m.id::text
         or se.metadata::text like '%' || m.output_message_id || '%'
    ) as system_event_reference
  from missing m
),
eligible as (
  select
    m.id,
    ef.runtime_event_count,
    m.status = 'completed'
      and m.error_code is null
      and ef.has_stream_started
      and ef.has_first_token
      and ef.has_stream_completed
      and not ef.has_stream_failed
      and ef.stream_started_at <= ef.first_token_at
      and ef.first_token_at <= ef.stream_completed_at as completed_flow_proven,
    not cs.any_message_id_match
      and not cs.snapshot_references_output_id
      and not cs.sync_references_output_id
      and not cs.runtime_event_references_output_id as exact_content_authority_absent,
    cs.system_event_reference
  from missing m
  join event_flags ef on ef.id = m.id
  join candidate_sources cs on cs.id = m.id
),
updated as (
  update public.agent_tasks t
  set metadata = coalesce(t.metadata, '{}'::jsonb) || jsonb_build_object(
    'durability', 'non_durable_historical_workflow_output',
    'durabilityStatus', 'quarantined_non_durable',
    'durabilityReason', 'completed_without_authoritative_message',
    'durabilityEvidence', 'stream_started_first_token_stream_completed_plus_system_event_only',
    'durabilityRemediation', 'metadata_only_marker',
    'durabilityRemediationProtocol', 'v20-generated-output-durability',
    'durabilityMarkerVersion', 1,
    'durabilityCompletedFlowProven', true,
    'durabilityExactContentAuthority', 'absent',
    'durabilityRuntimeEventCount', e.runtime_event_count,
    'durabilityRemediatedAt', coalesce(t.metadata->>'durabilityRemediatedAt', now()::text)
  )
  from eligible e
  where t.id = e.id
    and e.completed_flow_proven
    and e.exact_content_authority_absent
    and e.system_event_reference
    and (
      t.metadata->>'durability' is distinct from 'non_durable_historical_workflow_output'
      or t.metadata->>'durabilityStatus' is distinct from 'quarantined_non_durable'
      or t.metadata->>'durabilityReason' is distinct from 'completed_without_authoritative_message'
    )
  returning
    t.id,
    t.workspace_id,
    t.agent_id,
    t.metadata->>'durability' as durability,
    t.metadata->>'durabilityStatus' as durability_status,
    t.metadata->>'durabilityReason' as durability_reason,
    t.metadata->>'durabilityCompletedFlowProven' as completed_flow_proven,
    t.metadata->>'durabilityExactContentAuthority' as exact_content_authority,
    t.metadata->>'durabilityRuntimeEventCount' as runtime_event_count
)
select jsonb_build_object(
  'operation', 'metadata_only_historical_output_quarantine',
  'updated_count', count(*),
  'status_changed', false,
  'messages_changed', false,
  'content_backfilled', false,
  'redacted_updated_rows', coalesce(jsonb_agg(jsonb_build_object(
    'task_hash', md5(id::text),
    'workspace_hash', md5(workspace_id),
    'agent_hash', md5(coalesce(agent_id, '')),
    'durability', durability,
    'durability_status', durability_status,
    'durability_reason', durability_reason,
    'completed_flow_proven', completed_flow_proven,
    'exact_content_authority', exact_content_authority,
    'runtime_event_count', runtime_event_count
  )), '[]'::jsonb)
) as metadata_marker_result
from updated;
