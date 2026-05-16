-- danish.ink initial schema
-- Creates the `summaries` table holding twice-daily curated digests,
-- enables RLS, and grants public (anon) read access.

create table summaries (
  id           uuid        primary key default gen_random_uuid(),
  date         date        not null,
  slot         text        not null check (slot in ('morning', 'evening')),
  content      text,
  status       text        not null check (status in ('success', 'error')),
  error_msg    text,
  generated_at timestamptz not null default now(),
  unique (date, slot)
);

alter table summaries enable row level security;

create policy "summaries are publicly readable"
  on summaries for select
  to anon
  using (true);

-- Seed row so the SSR homepage has something to render end-to-end.
insert into summaries (date, slot, content, status)
values (
  current_date,
  'morning',
  'This is a placeholder digest. The real briefings begin once the agent ships in a later issue. Today the world kept turning; tomorrow it will turn again.',
  'success'
);
