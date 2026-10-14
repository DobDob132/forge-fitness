begin;
create policy forge_published_plans_no_direct_access on public.forge_published_plans
for all to anon,authenticated using (false) with check (false);
commit;
