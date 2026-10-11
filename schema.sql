-- GHOST ESPORT database schema for Supabase (Postgres)
-- Run in Supabase SQL Editor. Review policies before production.
create extension if not exists pgcrypto;

create type public.app_role as enum ('player', 'admin');
create type public.match_status as enum ('draft', 'open', 'full', 'live', 'completed', 'cancelled');
create type public.registration_status as enum ('registered', 'confirmed', 'cancelled');
create type public.payment_status as enum ('created', 'pending', 'paid', 'failed', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  player_name text not null default 'Player' check (char_length(player_name) between 1 and 30),
  game_uid text check (game_uid is null or char_length(game_uid) <= 40),
  favorite_game text not null default 'Free Fire',
  role public.app_role not null default 'player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 90),
  game text not null default 'Free Fire' check (game = 'Free Fire'),
  mode text not null check (mode in ('Solo','Duo','Squad')),
  starts_at timestamptz not null,
  entry_fee numeric(10,2) not null default 0 check (entry_fee >= 0),
  prize_pool numeric(12,2) not null default 0 check (prize_pool >= 0),
  slots_total integer not null default 48 check (slots_total between 2 and 1000),
  slots_taken integer not null default 0 check (slots_taken >= 0 and slots_taken <= slots_total),
  status public.match_status not null default 'draft',
  room_id text,
  room_password_encrypted text, -- Do not expose to players before approved release time.
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.registration_status not null default 'registered',
  payment_id uuid,
  created_at timestamptz not null default now(),
  unique (match_id, user_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  registration_id uuid references public.registrations(id) on delete restrict,
  provider text not null check (provider in ('bkash','nagad')),
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'BDT' check (currency = 'BDT'),
  status public.payment_status not null default 'created',
  provider_payment_id text unique,
  reference text unique,
  checkout_url text,
  verified_at timestamptz,
  provider_payload jsonb, -- restrict access; webhook/server only should write.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.registrations add constraint registrations_payment_id_fkey
  foreign key (payment_id) references public.payments(id) on delete set null;

create table public.match_history (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('registered','result','cancelled')),
  result text,
  placement integer check (placement is null or placement > 0),
  kills integer check (kills is null or kills >= 0),
  created_at timestamptz not null default now()
);

create index matches_game_status_start_idx on public.matches(game, status, starts_at);
create index registrations_user_created_idx on public.registrations(user_id, created_at desc);
create index payments_user_created_idx on public.payments(user_id, created_at desc);
create index history_user_created_idx on public.match_history(user_id, created_at desc);

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Create a profile after each signup. User metadata is never allowed to set role.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, player_name)
  values (new.id, coalesce(nullif(left(new.raw_user_meta_data->>'player_name',30),''), 'Player'))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Safe registration RPC: prevents duplicates, closed matches and overbooking.
create or replace function public.register_for_match(p_match_id uuid)
returns uuid language plpgsql security definer
set search_path = public
as $$
declare v_user uuid := auth.uid(); v_registration uuid; v_match public.matches%rowtype;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'Match not found'; end if;
  if v_match.status <> 'open' then raise exception 'Registration is closed'; end if;
  if v_match.starts_at <= now() then raise exception 'Match has already started'; end if;
  if v_match.slots_taken >= v_match.slots_total then raise exception 'Match is full'; end if;
  if exists(select 1 from public.registrations where match_id = p_match_id and user_id = v_user and status <> 'cancelled') then
    raise exception 'Already registered';
  end if;
  insert into public.registrations(match_id,user_id,status) values(p_match_id,v_user,'registered')
    returning id into v_registration;
  update public.matches set slots_taken = slots_taken + 1, updated_at = now() where id = p_match_id;
  insert into public.match_history(match_id,user_id,event_type) values(p_match_id,v_user,'registered');
  return v_registration;
end;
$$;
revoke all on function public.register_for_match(uuid) from public;
grant execute on function public.register_for_match(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.registrations enable row level security;
alter table public.payments enable row level security;
alter table public.match_history enable row level security;

create policy "Profiles readable by owner or admin" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "Players update own basic profile" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));
create policy "Public can read open and published matches" on public.matches
for select to anon, authenticated using (status in ('open','full','live','completed') or public.is_admin());
create policy "Admins create matches" on public.matches
for insert to authenticated with check (public.is_admin() and created_by = auth.uid());
create policy "Admins update matches" on public.matches
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Players read own registrations" on public.registrations
for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Admins update registrations" on public.registrations
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Players read own payment metadata" on public.payments
for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Players read own history" on public.match_history
for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Admins insert match history" on public.match_history
for insert to authenticated with check (public.is_admin());

grant select on public.matches to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.registrations to authenticated;
grant select on public.payments to authenticated;
grant select on public.match_history to authenticated;
grant insert, update on public.matches to authenticated;
grant update on public.registrations to authenticated;
grant insert on public.match_history to authenticated;

-- IMPORTANT: payments intentionally have no client INSERT/UPDATE policies.
-- Never expose provider secrets or allow clients to mark payments as paid.
-- Admin bootstrap must be done by a trusted project owner using SQL, after signup:
-- update public.profiles set role = 'admin' where id = '<AUTH_USER_UUID>';
-- Never add a public endpoint that lets a user change their own role.
