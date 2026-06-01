-- V20 historical missing output authority candidate probe.
-- Read-only. This checks whether completed tasks missing a durable message have
-- any trusted authority candidate. It returns aggregate counts and redacted
-- hashes only.

with completed_output_tasks as (
  select
    id,
    workspace_id,
    agent_id,
    output_message_id,
    created_at,
    case
      when output_message_id like '%:%:output' then 'workflow_runtime_pattern'
      when output_message_id like 'message_%' then 'message_prefix'
      else 'other'
    end as output_id_shape
  from public.agent_tasks
  where status = 'completed'
    and task_type = 'chat'
    and output_message_id is not null
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
candidate_sources as (
  select
    m.id,
    m.workspace_id,
    m.agent_id,
    m.output_message_id,
    m.created_at,
    exists (
      select 1
      from public.messages any_msg
      where any_msg.id = m.output_message_id
    ) as any_message_id_match,
    exists (
      select 1
      from public.workspace_snapshots s
      where s.workspace_id = m.workspace_id
        and s.payload::text like '%' || m.output_message_id || '%'
    ) as snapshot_references_output_id,
    exists (
      select 1
      from public.workspace_snapshots s
      where s.workspace_id = m.workspace_id
        and s.payload::text like '%' || m.id::text || '%'
    ) as snapshot_references_task_id,
    exists (
      select 1
      from public.sync_operations so
      where so.workspace_id = m.workspace_id
        and so.payload::text like '%' || m.output_message_id || '%'
    ) as sync_references_output_id,
    exists (
      select 1
      from public.sync_operations so
      where so.workspace_id = m.workspace_id
        and so.payload::text like '%' || m.id::text || '%'
    ) as sync_references_task_id,
    exists (
      select 1
      from public.agent_runtime_events e
      where e.task_id = m.id
        and e.event_type = 'stream_completed'
    ) as runtime_completed_event,
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
)
select jsonb_build_object(
  'scope', 'historical missing durable message rows',
  'missing_count', count(*),
  'authority_candidate_counts', jsonb_build_object(
    'any_message_id_match', count(*) filter (where any_message_id_match),
    'snapshot_references_output_id', count(*) filter (where snapshot_references_output_id),
    'snapshot_references_task_id', count(*) filter (where snapshot_references_task_id),
    'sync_references_output_id', count(*) filter (where sync_references_output_id),
    'sync_references_task_id', count(*) filter (where sync_references_task_id),
    'runtime_completed_event', count(*) filter (where runtime_completed_event),
    'runtime_event_references_output_id',
      count(*) filter (where runtime_event_references_output_id),
    'system_event_reference', count(*) filter (where system_event_reference)
  ),
  'redacted_rows', (
    select coalesce(jsonb_agg(row_to_json(rows) order by created_at), '[]'::jsonb)
    from (
      select
        md5(id::text) as task_hash,
        md5(workspace_id) as workspace_hash,
        md5(coalesce(agent_id, '')) as agent_hash,
        md5(output_message_id) as output_message_hash,
        any_message_id_match,
        snapshot_references_output_id,
        snapshot_references_task_id,
        sync_references_output_id,
        sync_references_task_id,
        runtime_completed_event,
        runtime_event_references_output_id,
        system_event_reference,
        created_at
      from candidate_sources
      order by created_at
    ) rows
  )
) as historical_missing_authority_candidates
from candidate_sources;
