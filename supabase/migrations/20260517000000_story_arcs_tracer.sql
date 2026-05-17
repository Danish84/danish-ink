-- Story Arcs V1 tracer schema.
-- Adds public-readable confirmed/closed arcs and paragraph-level assignments.

create type public.arc_status as enum (
  'proposed',
  'active',
  'closure_candidate',
  'closed'
);

create table public.arcs (
  id                            uuid primary key default gen_random_uuid(),
  slug                          text not null unique,
  title                         text not null,
  description                   text,
  status                        public.arc_status not null default 'proposed',
  opened_at                     timestamptz not null default now(),
  closed_at                     timestamptz,
  last_mentioned_at             timestamptz not null default now(),
  proposed_from_summary_id      uuid references public.summaries(id) on delete set null,
  proposed_from_paragraph_index int
);

create table public.slot_arcs (
  summary_id      uuid not null references public.summaries(id) on delete cascade,
  paragraph_index int not null,
  arc_id          uuid not null references public.arcs(id) on delete cascade,
  day_number      int not null,
  created_at      timestamptz not null default now(),
  primary key (summary_id, paragraph_index)
);

create index arcs_status_idx on public.arcs(status);
create index arcs_last_mentioned_idx on public.arcs(last_mentioned_at desc);
create index arcs_closed_at_idx on public.arcs(closed_at desc);
create index slot_arcs_arc_id_idx on public.slot_arcs(arc_id);

alter table public.arcs enable row level security;
alter table public.slot_arcs enable row level security;

create policy "confirmed arcs are publicly readable"
  on public.arcs for select
  to anon
  using (status in ('active', 'closure_candidate', 'closed'));

create policy "confirmed arc assignments are publicly readable"
  on public.slot_arcs for select
  to anon
  using (
    exists (
      select 1
      from public.arcs
      where arcs.id = slot_arcs.arc_id
        and arcs.status in ('active', 'closure_candidate', 'closed')
    )
  );
