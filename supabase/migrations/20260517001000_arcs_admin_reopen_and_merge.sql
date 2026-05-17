alter table public.arcs
  add column reopen_dismissed_at timestamptz;

create or replace function public.merge_proposed_arc(
  p_proposed_arc_id uuid,
  p_target_arc_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  merged_latest timestamptz;
begin
  if p_proposed_arc_id = p_target_arc_id then
    raise exception 'cannot merge an arc into itself';
  end if;

  if not exists (
    select 1 from public.arcs
    where id = p_proposed_arc_id
      and status = 'proposed'
  ) then
    raise exception 'source arc is not proposed';
  end if;

  if not exists (
    select 1 from public.arcs
    where id = p_target_arc_id
      and status in ('active', 'closure_candidate', 'closed')
  ) then
    raise exception 'target arc is not mergeable';
  end if;

  select max(s.generated_at)
    into merged_latest
  from public.slot_arcs sa
  join public.summaries s on s.id = sa.summary_id
  where sa.arc_id = p_proposed_arc_id;

  update public.slot_arcs
    set arc_id = p_target_arc_id
  where arc_id = p_proposed_arc_id;

  update public.arcs
    set last_mentioned_at = greatest(
      last_mentioned_at,
      coalesce(merged_latest, last_mentioned_at)
    )
  where id = p_target_arc_id;

  delete from public.arcs
  where id = p_proposed_arc_id;
end;
$$;
