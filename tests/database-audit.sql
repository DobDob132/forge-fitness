-- Disposable test records exist only inside this rolled-back transaction.
begin;
do $audit$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); test_payload jsonb; saved public.forge_state; denied boolean; friend_id uuid; result jsonb;
begin
 insert into auth.users(id,email,raw_user_meta_data) values
 (a,a::text||'@example.invalid',jsonb_build_object('display_name','audit_'||left(a::text,30))),
 (b,b::text||'@example.invalid',jsonb_build_object('display_name','audit_'||left(b::text,30))),
 (c,c::text||'@example.invalid',jsonb_build_object('display_name','audit_'||left(c::text,30)));
 insert into public.forge_friendships(requester,recipient,status) values(a,b,'accepted') returning id into friend_id;
 test_payload:=jsonb_build_object('allPlans','[]'::jsonb,'logs','[]'::jsonb,'xp',100,'level',2);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 set local role authenticated;
 select * into saved from public.forge_save_state(test_payload,0);
 if saved.user_id<>a or saved.version<>1 then raise exception 'initial save failed'; end if;
 select * into saved from public.forge_save_state(test_payload,1);
 if saved.version<>2 then raise exception 'version increment failed'; end if;
 denied:=false;
 begin perform public.forge_save_state(test_payload,1); exception when sqlstate 'PT409' then denied:=true; end;
 if not denied then raise exception 'stale version accepted'; end if;
 denied:=false;
 begin insert into public.forge_state(user_id,payload) values(b,test_payload); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'foreign owner insert accepted'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 if exists(select 1 from public.forge_state where user_id=a) then raise exception 'foreign state readable'; end if;
 if exists(select 1 from public.forge_profiles where user_id=a) then raise exception 'foreign profile readable'; end if;
 if jsonb_array_length(public.forge_friends('list'))<>1 then raise exception 'friend list failed'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c,'role','authenticated')::text,true);
 if jsonb_array_length(public.forge_friends('list'))<>0 then raise exception 'stranger sees relationships'; end if;
 denied:=false;
 begin perform public.forge_friends('accept',null,friend_id); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'stranger changes friendship'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 update public.forge_state set payload=jsonb_set(payload,'{level}','99999999999999999999999'::jsonb) where user_id=a;
 result:=public.forge_social('leaderboard');
 if jsonb_array_length(result)<>2 then raise exception 'leaderboard failed'; end if;
 set local role anon;
 denied:=false;
 begin perform 1 from public.forge_state limit 1; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'anonymous state readable'; end if;
 set local role postgres;
end $audit$;
rollback;
select 'PASS: RLS, ownership, version conflicts, friends, leaderboard overflow and anonymous denial; fixtures rolled back' as result;
