begin;
create schema if not exists forge_private;
revoke all on schema forge_private from public, anon;
grant usage on schema forge_private to authenticated;

create table public.forge_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 5242880),
 version bigint not null default 1 check(version > 0),
 updated_at timestamptz not null default now()
);
alter table public.forge_state enable row level security;
revoke all on public.forge_state from anon, authenticated;
grant select, insert on public.forge_state to authenticated;
grant update(payload, version, updated_at) on public.forge_state to authenticated;
create policy forge_state_select on public.forge_state for select to authenticated using ((select auth.uid()) = user_id);
create policy forge_state_insert on public.forge_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy forge_state_update on public.forge_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create function public.forge_save_state(p_payload jsonb, p_expected_version bigint)
returns public.forge_state language plpgsql security invoker set search_path = '' as $$
declare result public.forge_state; uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Anmeldung erforderlich' using errcode = '42501'; end if;
 if jsonb_typeof(p_payload->'allPlans') is distinct from 'array' or jsonb_typeof(p_payload->'logs') is distinct from 'array' then
   raise exception 'Ungültige Trainingsdaten' using errcode = '22023';
 end if;
 if p_expected_version = 0 then
  insert into public.forge_state(user_id, payload) values(uid,p_payload)
  on conflict (user_id) do nothing returning * into result;
 else
  update public.forge_state set payload = p_payload, version = version+1, updated_at = now()
  where user_id = uid and version = p_expected_version returning * into result;
 end if;
 if result.user_id is null then raise exception 'SYNC_CONFLICT' using errcode = 'PT409'; end if;
 return result;
end $$;
revoke all on function public.forge_save_state(jsonb,bigint) from public, anon;
grant execute on function public.forge_save_state(jsonb,bigint) to authenticated;

create table public.forge_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(length(btrim(display_name)) between 1 and 40),
 friend_code uuid not null unique default gen_random_uuid(),
 created_at timestamptz not null default now()
);
alter table public.forge_profiles enable row level security;
revoke all on public.forge_profiles from anon, authenticated;
grant select on public.forge_profiles to authenticated;
grant insert(user_id,display_name), update(display_name) on public.forge_profiles to authenticated;
create policy forge_profile_select on public.forge_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy forge_profile_insert on public.forge_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy forge_profile_update on public.forge_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table public.forge_friendships (
 id uuid primary key default gen_random_uuid(),
 requester uuid not null references public.forge_profiles(user_id) on delete cascade,
 recipient uuid not null references public.forge_profiles(user_id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted')),
 created_at timestamptz not null default now(),
 check(requester <> recipient)
);
create unique index forge_friendship_pair on public.forge_friendships(least(requester,recipient),greatest(requester,recipient));
create index forge_friendship_requester on public.forge_friendships(requester);
create index forge_friendship_recipient on public.forge_friendships(recipient);
alter table public.forge_friendships enable row level security;
revoke all on public.forge_friendships from anon, authenticated;
grant select on public.forge_friendships to authenticated;
create policy forge_friendship_select on public.forge_friendships for select to authenticated
using ((select auth.uid()) = requester or (select auth.uid()) = recipient);

-- The private implementation is privileged only to resolve an exact secret friend
-- code and mutate a relationship after checking its participants. No training data.
create function forge_private.friend_action(p_action text, p_code uuid default null, p_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); other_id uuid; relationship public.forge_friendships; result jsonb;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid) then
  raise exception 'Anmeldung erforderlich' using errcode='42501';
 end if;
 if p_action='list' then
  select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'status',f.status,'incoming',f.recipient=uid,
    'display_name',p.display_name) order by f.created_at desc),'[]'::jsonb) into result
  from public.forge_friendships f join public.forge_profiles p
  on p.user_id=case when f.requester=uid then f.recipient else f.requester end
  where f.requester=uid or f.recipient=uid;
  return result;
 elsif p_action='request' then
  select user_id into other_id from public.forge_profiles where friend_code=p_code and user_id<>uid;
  if other_id is null then raise exception 'Freundescode nicht gefunden' using errcode='22023'; end if;
  if (select count(*) from public.forge_friendships where requester=uid and status='pending') >= 25 then
    raise exception 'Zu viele offene Anfragen' using errcode='22023';
  end if;
  insert into public.forge_friendships(requester,recipient) values(uid,other_id) on conflict do nothing;
  return jsonb_build_object('ok',true);
 elsif p_action in ('accept','remove') then
  select * into relationship from public.forge_friendships where id=p_id for update;
  if relationship.id is null or (relationship.requester<>uid and relationship.recipient<>uid) then
    raise exception 'Anfrage nicht gefunden' using errcode='42501';
  end if;
  if p_action='accept' then
   if relationship.recipient<>uid or relationship.status<>'pending' then
    raise exception 'Anfrage kann nicht angenommen werden' using errcode='42501';
   end if;
   update public.forge_friendships set status='accepted' where id=p_id;
  else delete from public.forge_friendships where id=p_id;
  end if;
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Unbekannte Aktion' using errcode='22023';
end $$;
revoke all on function forge_private.friend_action(text,uuid,uuid) from public, anon;
grant execute on function forge_private.friend_action(text,uuid,uuid) to authenticated;
create function public.forge_friends(p_action text, p_code uuid default null, p_id uuid default null)
returns jsonb language sql security invoker set search_path='' as $$
 select forge_private.friend_action(p_action,p_code,p_id);
$$;
revoke all on function public.forge_friends(text,uuid,uuid) from public, anon;
grant execute on function public.forge_friends(text,uuid,uuid) to authenticated;

create table public.forge_plan_shares (
 id uuid primary key default gen_random_uuid(),
 sender uuid not null references public.forge_profiles(user_id) on delete cascade,
 recipient uuid not null references public.forge_profiles(user_id) on delete cascade,
 plan jsonb not null check(jsonb_typeof(plan)='object' and pg_column_size(plan)<=262144),
 created_at timestamptz not null default now(),
 check(sender<>recipient)
);
create index forge_plan_shares_recipient on public.forge_plan_shares(recipient,created_at desc);
create index forge_plan_shares_sender on public.forge_plan_shares(sender);
alter table public.forge_plan_shares enable row level security;
revoke all on public.forge_plan_shares from anon,authenticated;
grant select on public.forge_plan_shares to authenticated;
create policy forge_plan_shares_select on public.forge_plan_shares for select to authenticated
using ((select auth.uid())=sender or (select auth.uid())=recipient);

create table public.forge_challenges (
 id uuid primary key default gen_random_uuid(),
 creator uuid not null references public.forge_profiles(user_id) on delete cascade,
 opponent uuid not null references public.forge_profiles(user_id) on delete cascade,
 week_start date not null,
 target smallint not null check(target between 1 and 14),
 creator_progress smallint not null default 0 check(creator_progress between 0 and 14),
 opponent_progress smallint not null default 0 check(opponent_progress between 0 and 14),
 status text not null default 'pending' check(status in ('pending','accepted')),
 created_at timestamptz not null default now(),
 check(creator<>opponent)
);
create unique index forge_challenge_pair_week on public.forge_challenges(least(creator,opponent),greatest(creator,opponent),week_start);
create index forge_challenges_creator on public.forge_challenges(creator,week_start desc);
create index forge_challenges_opponent on public.forge_challenges(opponent,week_start desc);
alter table public.forge_challenges enable row level security;
revoke all on public.forge_challenges from anon,authenticated;
grant select on public.forge_challenges to authenticated;
create policy forge_challenges_select on public.forge_challenges for select to authenticated
using ((select auth.uid())=creator or (select auth.uid())=opponent);

create function forge_private.social_action(p_action text,p_id uuid default null,p_friend uuid default null,p_payload jsonb default null,p_value integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); row_share public.forge_plan_shares; row_challenge public.forge_challenges; result jsonb; monday date:=(current_date-(extract(isodow from current_date)::int-1));
begin
 if uid is null or not exists(select 1 from auth.users where id=uid) then raise exception 'Anmeldung erforderlich' using errcode='42501'; end if;
 if p_action='friends' then
  select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'display_name',p.display_name) order by p.display_name),'[]'::jsonb) into result
  from public.forge_friendships f join public.forge_profiles p on p.user_id=case when f.requester=uid then f.recipient else f.requester end
  where f.status='accepted' and (f.requester=uid or f.recipient=uid); return result;
 elsif p_action='share_plan' then
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or jsonb_array_length(coalesce(p_payload->'days','[]'::jsonb))<>7 or pg_column_size(p_payload)>262144 then raise exception 'Ungültiger Trainingsplan' using errcode='22023'; end if;
  if not exists(select 1 from public.forge_friendships where status='accepted' and ((requester=uid and recipient=p_friend) or (recipient=uid and requester=p_friend))) then raise exception 'Nur mit Freunden möglich' using errcode='42501'; end if;
  insert into public.forge_plan_shares(sender,recipient,plan) values(uid,p_friend,p_payload);return jsonb_build_object('ok',true);
 elsif p_action='plan_shares' then
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'sender_name',p.display_name,'plan',s.plan,'created_at',s.created_at) order by s.created_at desc),'[]'::jsonb) into result
  from public.forge_plan_shares s join public.forge_profiles p on p.user_id=s.sender where s.recipient=uid;return result;
 elsif p_action in ('take_plan','dismiss_share') then
  select * into row_share from public.forge_plan_shares where id=p_id and recipient=uid for update;
  if row_share.id is null then raise exception 'Geteilter Plan nicht gefunden' using errcode='42501'; end if;
  delete from public.forge_plan_shares where id=p_id;return case when p_action='take_plan' then row_share.plan else jsonb_build_object('ok',true) end;
 elsif p_action='create_challenge' then
  if p_value is null or p_value not between 1 and 14 then raise exception 'Ziel muss zwischen 1 und 14 liegen' using errcode='22023'; end if;
  if not exists(select 1 from public.forge_friendships where status='accepted' and ((requester=uid and recipient=p_friend) or (recipient=uid and requester=p_friend))) then raise exception 'Nur mit Freunden möglich' using errcode='42501'; end if;
  insert into public.forge_challenges(creator,opponent,week_start,target) values(uid,p_friend,monday,p_value);return jsonb_build_object('ok',true);
 elsif p_action='challenges' then
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'incoming',c.opponent=uid,'status',c.status,'target',c.target,'week_start',c.week_start,'creator_progress',c.creator_progress,'opponent_progress',c.opponent_progress,'creator_name',pc.display_name,'opponent_name',po.display_name) order by c.created_at desc),'[]'::jsonb) into result
  from public.forge_challenges c join public.forge_profiles pc on pc.user_id=c.creator join public.forge_profiles po on po.user_id=c.opponent
  where c.week_start=monday and (c.creator=uid or c.opponent=uid);return result;
 elsif p_action='accept_challenge' then
  update public.forge_challenges set status='accepted' where id=p_id and opponent=uid and status='pending' returning * into row_challenge;
  if row_challenge.id is null then raise exception 'Challenge nicht gefunden' using errcode='42501'; end if;return jsonb_build_object('ok',true);
 elsif p_action='remove_challenge' then
  delete from public.forge_challenges where id=p_id and (creator=uid or opponent=uid) returning * into row_challenge;
  if row_challenge.id is null then raise exception 'Challenge nicht gefunden' using errcode='42501'; end if;return jsonb_build_object('ok',true);
 elsif p_action='sync_progress' then
  if p_value is null or p_value not between 0 and 14 then raise exception 'Ungültiger Fortschritt' using errcode='22023'; end if;
  update public.forge_challenges set creator_progress=least(target,p_value) where creator=uid and week_start=monday and status='accepted';
  update public.forge_challenges set opponent_progress=least(target,p_value) where opponent=uid and week_start=monday and status='accepted';return jsonb_build_object('ok',true);
 end if;
 raise exception 'Unbekannte Aktion' using errcode='22023';
end $$;
revoke all on function forge_private.social_action(text,uuid,uuid,jsonb,integer) from public,anon;
grant execute on function forge_private.social_action(text,uuid,uuid,jsonb,integer) to authenticated;
create function public.forge_social(p_action text,p_id uuid default null,p_friend uuid default null,p_payload jsonb default null,p_value integer default null)
returns jsonb language sql security invoker set search_path='' as $$select forge_private.social_action(p_action,p_id,p_friend,p_payload,p_value);$$;
revoke all on function public.forge_social(text,uuid,uuid,jsonb,integer) from public,anon;
grant execute on function public.forge_social(text,uuid,uuid,jsonb,integer) to authenticated;
commit;
