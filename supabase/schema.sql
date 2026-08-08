-- Letters For You — run this once in the Supabase SQL editor.
--
-- THE WHOLE POINT OF THIS FILE: a sealed letter's text must not leave the
-- database before its unlock date. Not hidden in the client, not filtered in
-- JavaScript — never sent. Anyone can open dev tools; the network tab has to be
-- boring until the day arrives.
--
-- How that's enforced:
--   · the base table is not readable by anyone. No select policy at all.
--   · reads go through public.letters_public, a security-invoker-off view that
--     returns message ONLY when unlock_date <= current_date, and null otherwise.
--   · the date comparison happens here, on the server. The client's clock is
--     not consulted and cannot be lied about.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- the table
create table if not exists public.letters (
  id          uuid primary key default gen_random_uuid(),
  from_name   text        not null check (length(trim(from_name)) between 1 and 80),
  message     text        not null check (length(trim(message))   between 1 and 1500),
  unlock_date date        not null,
  envelope    text        not null check (envelope in (
                'lemon','azure','open-lemon','sunshine','deep-blue','open-sky',
                'fiore','airmail','pink','open-azure','tied','gingham')),
  sticker     text,
  created_at  timestamptz not null default now()
);

alter table public.letters enable row level security;

-- Anyone may post a letter. Nobody may read, update or delete this table
-- directly — there is deliberately no select/update/delete policy.
drop policy if exists "anyone can post a letter" on public.letters;
create policy "anyone can post a letter"
  on public.letters for insert to anon, authenticated
  with check (true);

-- --------------------------------------------------------------- the view
-- security_invoker = off (the default for views) means this runs as its owner
-- and can read the table that RLS otherwise closes off. The view itself is the
-- only door, and it withholds the message until the date.
create or replace view public.letters_public as
  select
    id,
    from_name,
    unlock_date,
    envelope,
    sticker,
    created_at,
    (unlock_date <= current_date) as unlocked,
    case when unlock_date <= current_date then message else null end as message
  from public.letters;

alter view public.letters_public set (security_invoker = off);

grant select on public.letters_public to anon, authenticated;
revoke all on public.letters from anon, authenticated;
grant insert on public.letters to anon, authenticated;

-- If you already ran an earlier version of this file, widen the limit with:
--   alter table public.letters drop constraint letters_message_check;
--   alter table public.letters add constraint letters_message_check
--     check (length(trim(message)) between 1 and 1500);

-- ------------------------------------------------------------------ notes
-- · current_date is the database's date, in the database's timezone. If she and
--   the database disagree about what day it is, the database wins — which is
--   the safe direction: a letter can only ever open late, never early.
-- · Nothing about what she has read is stored here. That stays in her browser.
