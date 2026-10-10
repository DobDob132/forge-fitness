begin;

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

create or replace function forge_private.social_action(p_action text,p_id uuid default null,p_friend uuid default null,p_payload jsonb default null,p_value integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); row_share public.forge_plan_shares; row_challenge public.forge_challenges; result jsonb; challenge_metric text; challenge_days integer; challenge_target bigint;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid) then raise exception 'Anmeldung erforderlich' using errcode='42501'; end if;
 if p_action='friends' then
  select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'display_name',p.display_name) order by p.display_name),'[]'::jsonb) into result from public.forge_friendships f join public.forge_profiles p on p.user_id=case when f.requester=uid then f.recipient else f.requester end where f.status='accepted' and (f.requester=uid or f.recipient=uid);return result;
 elsif p_action='leaderboard' then
  select coalesce(jsonb_agg(jsonb_build_object('user_id',members.user_id,'display_name',members.display_name,'level',members.level,'is_me',members.user_id=uid) order by members.level desc,members.display_name),'[]'::jsonb) into result
  from (select p.user_id,p.display_name,case when jsonb_typeof(s.payload->'level')='number' then greatest(1,least(100000,floor((s.payload->>'level')::numeric)))::integer else 1 end as level
        from public.forge_profiles p left join public.forge_state s on s.user_id=p.user_id
        where p.user_id=uid or exists(select 1 from public.forge_friendships f where f.status='accepted' and ((f.requester=uid and f.recipient=p.user_id) or (f.recipient=uid and f.requester=p.user_id)))) members;
  return result;
 elsif p_action='share_plan' then
  if not forge_private.valid_plan_payload(p_payload) then raise exception 'Ungültiger Trainingsplan' using errcode='22023'; end if;
  if not exists(select 1 from public.forge_friendships where status='accepted' and ((requester=uid and recipient=p_friend) or (recipient=uid and requester=p_friend))) then raise exception 'Nur mit Freunden möglich' using errcode='42501'; end if;
  insert into public.forge_plan_shares(sender,recipient,plan) values(uid,p_friend,p_payload);return jsonb_build_object('ok',true);
 elsif p_action='plan_shares' then
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'sender_name',p.display_name,'plan',s.plan,'created_at',s.created_at) order by s.created_at desc),'[]'::jsonb) into result from public.forge_plan_shares s join public.forge_profiles p on p.user_id=s.sender where s.recipient=uid;return result;
 elsif p_action in ('take_plan','dismiss_share') then
  select * into row_share from public.forge_plan_shares where id=p_id and recipient=uid for update;if row_share.id is null then raise exception 'Geteilter Plan nicht gefunden' using errcode='42501'; end if;delete from public.forge_plan_shares where id=p_id;return case when p_action='take_plan' then row_share.plan else jsonb_build_object('ok',true) end;
 elsif p_action='create_challenge' then
  challenge_metric:=coalesce(p_payload->>'metric','workouts');challenge_days:=coalesce((p_payload->>'days')::integer,7);challenge_target:=p_value;
  if challenge_metric not in ('workouts','sets','minutes','calories','volume') or challenge_days not in (7,14,30) or challenge_target is null or challenge_target not between 1 and 1000000000 then raise exception 'Ungültige Challenge' using errcode='22023'; end if;
  if not exists(select 1 from public.forge_friendships where status='accepted' and ((requester=uid and recipient=p_friend) or (recipient=uid and requester=p_friend))) then raise exception 'Nur mit Freunden möglich' using errcode='42501'; end if;
  insert into public.forge_challenges(creator,opponent,week_start,ends_on,metric,target) values(uid,p_friend,current_date,current_date+(challenge_days-1),challenge_metric,challenge_target);return jsonb_build_object('ok',true);
 elsif p_action='challenges' then
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'incoming',c.opponent=uid,'status',c.status,'target',c.target,'starts_on',c.week_start,'ends_on',c.ends_on,'metric',c.metric,'creator_progress',c.creator_progress,'opponent_progress',c.opponent_progress,'creator_name',pc.display_name,'opponent_name',po.display_name) order by case when c.status='pending' then 0 else 1 end,c.ends_on desc,c.created_at desc),'[]'::jsonb) into result from public.forge_challenges c join public.forge_profiles pc on pc.user_id=c.creator join public.forge_profiles po on po.user_id=c.opponent where (c.creator=uid or c.opponent=uid) and (c.status='pending' or c.ends_on>=current_date-30);return result;
 elsif p_action='accept_challenge' then
  update public.forge_challenges set status='accepted' where id=p_id and opponent=uid and status='pending' and ends_on>=current_date returning * into row_challenge;if row_challenge.id is null then raise exception 'Challenge nicht gefunden' using errcode='42501'; end if;return jsonb_build_object('ok',true);
 elsif p_action='remove_challenge' then
  delete from public.forge_challenges where id=p_id and (creator=uid or opponent=uid) returning * into row_challenge;if row_challenge.id is null then raise exception 'Challenge nicht gefunden' using errcode='42501'; end if;return jsonb_build_object('ok',true);
 elsif p_action='sync_challenge' then
  if p_value is null or p_value not between 0 and 1000000000 then raise exception 'Ungültiger Fortschritt' using errcode='22023'; end if;
  update public.forge_challenges set creator_progress=case when creator=uid then least(target,p_value) else creator_progress end,opponent_progress=case when opponent=uid then least(target,p_value) else opponent_progress end where id=p_id and status='accepted' and (creator=uid or opponent=uid) returning * into row_challenge;if row_challenge.id is null then raise exception 'Challenge nicht gefunden' using errcode='42501'; end if;return jsonb_build_object('ok',true);
 end if;
 raise exception 'Unbekannte Aktion' using errcode='22023';
end $$;

revoke all on function forge_private.social_action(text,uuid,uuid,jsonb,integer) from public,anon;
grant execute on function forge_private.social_action(text,uuid,uuid,jsonb,integer) to authenticated;

commit;
