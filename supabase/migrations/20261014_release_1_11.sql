begin;

grant usage on schema forge_private to anon;

create or replace function forge_private.valid_plan_payload(payload jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare day_item jsonb; exercise_item jsonb; sets_value numeric; weight_value numeric;
begin
 if payload is null or jsonb_typeof(payload)<>'object' or jsonb_typeof(payload->'name')<>'string'
    or length(btrim(payload->>'name')) not between 1 and 80 or jsonb_typeof(payload->'days')<>'array'
    or jsonb_array_length(payload->'days')<>7 or pg_column_size(payload)>262144 then return false; end if;
 for day_item in select value from jsonb_array_elements(payload->'days') loop
  if jsonb_typeof(day_item)<>'object' or jsonb_typeof(day_item->'ex')<>'array' then return false; end if;
  for exercise_item in select value from jsonb_array_elements(day_item->'ex') loop
   if jsonb_typeof(exercise_item)<>'array' or jsonb_array_length(exercise_item)<4
      or jsonb_typeof(exercise_item->0)<>'string' or length(btrim(exercise_item->>0)) not between 1 and 100
      or jsonb_typeof(exercise_item->2)<>'string' or length(btrim(exercise_item->>2)) not between 1 and 50 then return false; end if;
   sets_value:=(exercise_item->>1)::numeric;weight_value:=(exercise_item->>3)::numeric;
   if sets_value<>trunc(sets_value) or sets_value not between 1 and 100 or weight_value not between 0 and 10000 then return false; end if;
  end loop;
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function forge_private.valid_plan_payload(jsonb) from public,anon,authenticated;


create table public.forge_published_plans (
 id uuid primary key default gen_random_uuid(),
 creator uuid not null references public.forge_profiles(user_id) on delete cascade,
 source_plan_id text not null check(length(source_plan_id) between 1 and 100),
 title text not null check(length(btrim(title)) between 1 and 80),
 description text not null default '' check(length(description)<=500),
 category text not null check(category in ('strength','muscle','fitness','endurance','mobility','home')),
 difficulty text not null check(difficulty in ('beginner','intermediate','advanced')),
 equipment text not null default '' check(length(equipment)<=120),
 training_days smallint not null check(training_days between 1 and 7),
 plan jsonb not null check(forge_private.valid_plan_payload(plan)),
 download_count bigint not null default 0 check(download_count>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(creator,source_plan_id)
);
create index forge_published_plans_discovery on public.forge_published_plans(category,difficulty,training_days,updated_at desc);
create index forge_published_plans_popular on public.forge_published_plans(download_count desc);
alter table public.forge_published_plans enable row level security;
revoke all on public.forge_published_plans from public,anon,authenticated;

create function forge_private.public_plans_action(
 p_action text default 'list',p_id uuid default null,p_plan jsonb default null,p_metadata jsonb default null,
 p_query text default null,p_category text default null,p_difficulty text default null,p_days integer default null,
 p_sort text default 'newest',p_limit integer default 50,p_offset integer default 0
) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb; selected_plan jsonb; safe_limit integer:=least(100,greatest(1,coalesce(p_limit,50))); safe_offset integer:=greatest(0,coalesce(p_offset,0)); source_id text; title_value text; description_value text; category_value text; difficulty_value text; equipment_value text; days_value integer;
begin
 if p_action='list' then
  with filtered as (
   select pp.*,pr.display_name as author_name
   from public.forge_published_plans pp join public.forge_profiles pr on pr.user_id=pp.creator
   where (p_query is null or btrim(p_query)='' or pp.title ilike '%'||btrim(p_query)||'%' or pp.description ilike '%'||btrim(p_query)||'%' or pr.display_name ilike '%'||btrim(p_query)||'%')
     and (p_category is null or p_category='' or pp.category=p_category)
     and (p_difficulty is null or p_difficulty='' or pp.difficulty=p_difficulty)
     and (p_days is null or pp.training_days=p_days)
  ), ordered as (
   select * from filtered
   order by case when p_sort='popular' then download_count end desc nulls last,
            case when p_sort='name' then lower(title) end asc nulls last,
            case when p_sort not in ('popular','name') then updated_at end desc nulls last,id
   limit safe_limit offset safe_offset
  )
  select jsonb_build_object(
   'total',(select count(*) from filtered),
   'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'description',description,'category',category,'difficulty',difficulty,'equipment',equipment,'training_days',training_days,'plan',plan,'download_count',download_count,'updated_at',updated_at,'author_name',author_name,'is_mine',creator=uid)) from ordered),'[]'::jsonb)
  ) into result;
  return result;
 elsif p_action='publish' then
  if uid is null then raise exception 'Anmeldung erforderlich' using errcode='42501'; end if;
  if not forge_private.valid_plan_payload(p_plan) then raise exception 'Ungültiger Trainingsplan' using errcode='22023'; end if;
  source_id:=btrim(coalesce(p_metadata->>'sourcePlanId',''));title_value:=btrim(coalesce(p_metadata->>'title',''));
  description_value:=btrim(coalesce(p_metadata->>'description',''));category_value:=coalesce(p_metadata->>'category','');
  difficulty_value:=coalesce(p_metadata->>'difficulty','');equipment_value:=btrim(coalesce(p_metadata->>'equipment',''));
  days_value:=(select count(*) from jsonb_array_elements(p_plan->'days') day where jsonb_array_length(coalesce(day->'ex','[]'::jsonb))>0);
  if length(source_id) not between 1 and 100 or length(title_value) not between 1 and 80 or length(description_value)>500 or length(equipment_value)>120
     or category_value not in ('strength','muscle','fitness','endurance','mobility','home') or difficulty_value not in ('beginner','intermediate','advanced') or days_value not between 1 and 7 then
   raise exception 'Ungültige Veröffentlichungsdaten' using errcode='22023';
  end if;
  insert into public.forge_published_plans(creator,source_plan_id,title,description,category,difficulty,equipment,training_days,plan)
  values(uid,source_id,title_value,description_value,category_value,difficulty_value,equipment_value,days_value,p_plan)
  on conflict(creator,source_plan_id) do update set title=excluded.title,description=excluded.description,category=excluded.category,difficulty=excluded.difficulty,equipment=excluded.equipment,training_days=excluded.training_days,plan=excluded.plan,updated_at=now()
  returning jsonb_build_object('ok',true,'id',id) into result;return result;
 elsif p_action='take' then
  update public.forge_published_plans set download_count=download_count+1 where id=p_id returning plan into selected_plan;
  if selected_plan is null then raise exception 'Veröffentlichter Plan nicht gefunden' using errcode='22023'; end if;return selected_plan;
 elsif p_action='unpublish' then
  if uid is null then raise exception 'Anmeldung erforderlich' using errcode='42501'; end if;
  delete from public.forge_published_plans where id=p_id and creator=uid returning jsonb_build_object('ok',true) into result;
  if result is null then raise exception 'Veröffentlichung nicht gefunden' using errcode='42501'; end if;return result;
 end if;
 raise exception 'Unbekannte Aktion' using errcode='22023';
end $$;
revoke all on function forge_private.public_plans_action(text,uuid,jsonb,jsonb,text,text,text,integer,text,integer,integer) from public,anon,authenticated;
grant execute on function forge_private.public_plans_action(text,uuid,jsonb,jsonb,text,text,text,integer,text,integer,integer) to anon,authenticated;

create function public.forge_public_plans(
 p_action text default 'list',p_id uuid default null,p_plan jsonb default null,p_metadata jsonb default null,
 p_query text default null,p_category text default null,p_difficulty text default null,p_days integer default null,
 p_sort text default 'newest',p_limit integer default 50,p_offset integer default 0
) returns jsonb language sql security invoker set search_path='' as $$
 select forge_private.public_plans_action(p_action,p_id,p_plan,p_metadata,p_query,p_category,p_difficulty,p_days,p_sort,p_limit,p_offset);
$$;
revoke all on function public.forge_public_plans(text,uuid,jsonb,jsonb,text,text,text,integer,text,integer,integer) from public;
grant execute on function public.forge_public_plans(text,uuid,jsonb,jsonb,text,text,text,integer,text,integer,integer) to anon,authenticated;

create function forge_private.friend_milestones()
returns jsonb language sql security definer set search_path='' stable as $$
 select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'milestones',case when jsonb_typeof(s.payload->'claimedMilestones')='array' then s.payload->'claimedMilestones' else '[]'::jsonb end)),'[]'::jsonb)
 from public.forge_profiles p left join public.forge_state s on s.user_id=p.user_id
 where p.user_id=(select auth.uid()) or exists(select 1 from public.forge_friendships f where f.status='accepted' and ((f.requester=(select auth.uid()) and f.recipient=p.user_id) or (f.recipient=(select auth.uid()) and f.requester=p.user_id)));
$$;
revoke all on function forge_private.friend_milestones() from public,anon,authenticated;
grant execute on function forge_private.friend_milestones() to authenticated;
create function public.forge_friend_milestones() returns jsonb language sql security invoker set search_path='' as $$select forge_private.friend_milestones();$$;
revoke all on function public.forge_friend_milestones() from public,anon;
grant execute on function public.forge_friend_milestones() to authenticated;

commit;
