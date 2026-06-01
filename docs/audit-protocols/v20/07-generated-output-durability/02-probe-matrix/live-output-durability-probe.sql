-- V20 Generated Output Durability live probe.
-- Read-only. Returns aggregate counts, booleans, timestamps, and redacted hashes
-- only. Do not add raw message content, raw output ids, or secret-bearing fields.

with completed_output_tasks as (
  select
    id,
    workspace_id,
    agent_id,
    task_type,
    status,
    output_message_id,
    metadata,
    created_at,
    updated_at,
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
joined as (
  select
    t.*,
    m.id as message_id,
    m.role as message_role,
    length(btrim(coalesce(m.content, ''))) as message_content_length,
    exists (
      select 1
      from public.messages any_m
      where any_m.id = t.output_message_id
    ) as any_message_id_match
  from completed_output_tasks t
  left join public.messages m
    on m.id = t.output_message_id
   and m.workspace_id = t.workspace_id
   and coalesce(m.agent_id, '') = coalesce(t.agent_id, '')
   and m.task_id = t.id
),
classified as (
  select
    *,
    message_id is not null
      and message_role = 'assistant'
      and message_content_length > 0 as strict_durable_join_ok,
    metadata->>'durability' = 'non_durable_historical_workflow_output'
      and metadata->>'durabilityStatus' = 'quarantined_non_durable'
      and metadata->>'durabilityReason' = 'completed_without_authoritative_message'
      and metadata->>'durabilityCompletedFlowProven' = 'true'
      and metadata->>'durabilityExactContentAuthority' = 'absent'
        as quarantined_non_durable_historical
  from joined
)
select jsonb_build_object(
  'generated_at', now(),
  'scope', 'completed chat tasks with non-null output_message_id',
  'totals', jsonb_build_object(
    'completed_output_tasks', count(*),
    'strict_durable_join_ok', count(*) filter (where strict_durable_join_ok),
    'quarantined_non_durable_historical',
      count(*) filter (where not strict_durable_join_ok and quarantined_non_durable_historical),
    'active_unclassified_missing_durable_join',
      count(*) filter (where not strict_durable_join_ok and not quarantined_non_durable_historical),
    'accounted_for_by_durable_or_quarantine',
      count(*) filter (where strict_durable_join_ok or quarantined_non_durable_historical),
    'missing_but_any_message_id_exists',
      count(*) filter (where not strict_durable_join_ok and any_message_id_match),
    'missing_and_no_message_id_exists',
      count(*) filter (where not strict_durable_join_ok and not any_message_id_match)
  ),
  'stage_gate', jsonb_build_object(
    'active_unclassified_p0_count',
      count(*) filter (where not strict_durable_join_ok and not quarantined_non_durable_historical),
    'pass',
      count(*) filter (where not strict_durable_join_ok and not quarantined_non_durable_historical) = 0
  ),
  'by_output_id_shape', (
    select coalesce(jsonb_agg(row_to_json(shape_counts) order by output_id_shape), '[]'::jsonb)
    from (
      select
        output_id_shape,
        count(*) as total,
        count(*) filter (where strict_durable_join_ok) as strict_durable_join_ok,
        count(*) filter (where not strict_durable_join_ok and quarantined_non_durable_historical)
          as quarantined_non_durable_historical,
        count(*) filter (where not strict_durable_join_ok and not quarantined_non_durable_historical)
          as active_unclassified_missing
      from classified
      group by output_id_shape
    ) shape_counts
  ),
  'missing_window', jsonb_build_object(
    'first_created_at', min(created_at) filter (where not strict_durable_join_ok),
    'last_created_at', max(created_at) filter (where not strict_durable_join_ok)
  ),
  'missing_samples_redacted', (
    select coalesce(jsonb_agg(row_to_json(sample_rows) order by created_at), '[]'::jsonb)
    from (
      select
        md5(id::text) as task_hash,
        md5(workspace_id) as workspace_hash,
        md5(coalesce(agent_id, '')) as agent_hash,
        output_id_shape,
        any_message_id_match,
        quarantined_non_durable_historical,
        created_at
      from classified
      where not strict_durable_join_ok
      order by created_at
      limit 10
    ) sample_rows
  )
) as output_durability_live_probe
from classified;
