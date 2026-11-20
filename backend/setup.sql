-- Apply to a Supabase project with Google enabled in Authentication.
-- Only a trusted administrator may set app_metadata.role to "admin".
begin;

create table if not exists public.restaurants (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data ? 'id' and data->>'id' = id),
  hidden boolean not null default false
);

create table if not exists public.menus (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data ? 'id' and data->>'id' = id),
  restaurant_id text generated always as (data->>'rid') stored not null references public.restaurants(id),
  hidden boolean not null default false
);

create index if not exists menus_by_restaurant on public.menus(restaurant_id);
create unique index if not exists menus_active_name on public.menus
  (restaurant_id, regexp_replace(data->>'ko', '[[:space:]]+', '', 'g')) where not hidden;

create table if not exists public.reports (
  id text primary key default gen_random_uuid()::text,
  uid uuid not null default auth.uid() references auth.users(id),
  author text not null default '',
  type text not null check (type in ('edit', 'menu', 'restaurant', 'close', 'end')),
  rid text not null default '',
  mid text not null default '',
  title text not null default '',
  changes jsonb not null default '{}' check (jsonb_typeof(changes) = 'object'),
  method text not null default '' check (method in ('', 'self', 'label', 'staff')),
  memo text not null default '',
  photo text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'failed')),
  created_at timestamptz not null default now(),
  reviewer text,
  reviewed_at timestamptz,
  reason text,
  approved_keys text[] not null default '{}'
);

create index if not exists reports_review_queue on public.reports(status, created_at);
create index if not exists reports_author_history on public.reports(uid, created_at desc);
create index if not exists reports_target on public.reports(rid, mid, status);
create unique index if not exists reports_one_closure_per_user on public.reports
  (uid, type, rid, mid) where type in ('close', 'end');

create or replace function public.itda_is_admin() returns boolean
language sql stable set search_path = ''
as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', false) $$;

create or replace function public.itda_method_rank(value text) returns int
language sql immutable set search_path = ''
as $$ select case value when 'staff' then 3 when 'label' then 2 when 'self' then 1 else 0 end $$;

create or replace function public.itda_ingredients() returns text[]
language sql immutable set search_path = ''
as $$ select array['pork','beef','chicken','other','seafood','egg','dairy']::text[] $$;

create or replace function public.itda_in_campus(lat float8, lng float8) returns boolean
language sql immutable strict set search_path = ''
as $$ select point(lng,lat) <@ polygon '((126.9495,37.4692),(126.9516,37.4683),(126.9545,37.4694),(126.9574,37.4691),(126.9614,37.4665),(126.9622,37.4631),(126.9599,37.4589),(126.9603,37.4558),(126.9573,37.4528),(126.9553,37.4488),(126.9517,37.446),(126.9489,37.4472),(126.9481,37.451),(126.946,37.4535),(126.9466,37.4571),(126.9451,37.4612),(126.9465,37.4647),(126.9477,37.467))' $$;

create or replace function public.itda_restaurant_nearby(ko text, lat float8, lng float8)
returns boolean language sql stable set search_path = ''
as $$
  select exists (
    select 1 from public.restaurants r
    where not r.hidden and regexp_replace(r.data->>'ko', '[[:space:]]+', '', 'g') =
      regexp_replace(ko, '[[:space:]]+', '', 'g')
    and 12742000 * asin(least(1::float8,sqrt(
      sin(radians((r.data->>'lat')::float8-lat)/2)^2 +
      cos(radians(lat))*cos(radians((r.data->>'lat')::float8))*
      sin(radians((r.data->>'lng')::float8-lng)/2)^2
    ))) <= 50
  )
$$;

alter table public.restaurants enable row level security;
alter table public.menus enable row level security;
alter table public.reports enable row level security;

revoke all on public.restaurants, public.menus, public.reports from public, anon, authenticated;
grant select on public.restaurants, public.menus to anon, authenticated;
grant select on public.reports to anon;
grant select, insert on public.reports to authenticated;

drop policy if exists restaurants_visible on public.restaurants;
create policy restaurants_visible on public.restaurants for select to anon, authenticated using (not hidden);
drop policy if exists menus_visible on public.menus;
create policy menus_visible on public.menus for select to anon, authenticated using (
  not hidden and exists(select 1 from public.restaurants r where r.id = restaurant_id and not r.hidden)
);
drop policy if exists reports_visible on public.reports;
create policy reports_visible on public.reports for select to authenticated using (
  uid = (select auth.uid()) or (select public.itda_is_admin())
);
drop policy if exists reports_self_submit on public.reports;
create policy reports_self_submit on public.reports for insert to authenticated with check (
  uid = (select auth.uid()) and status = 'pending'
);

-- Private evidence can be read by the owner and reviewers. Approval of a catalog
-- photo makes only that exact object readable to visitors while its row is visible.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('evidence','evidence',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists itda_upload_evidence on storage.objects;
create policy itda_upload_evidence on storage.objects for insert to authenticated
with check (
  bucket_id = 'evidence' and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists itda_read_evidence on storage.objects;
create policy itda_read_evidence on storage.objects for select to anon, authenticated
using (
  bucket_id = 'evidence' and (
    (storage.foldername(name))[1] = (select auth.uid())::text or (select public.itda_is_admin())
    or exists (select 1 from public.restaurants r where r.data->>'photo' = name)
    or exists (select 1 from public.menus m where m.data->>'photo' = name)
  )
);

create or replace function public.itda_validate_report() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  allowed text[];
  field text;
  ingredients text[] := public.itda_ingredients();
  original jsonb;
  patch jsonb := '{}'::jsonb;
  file_path text;
  profile jsonb := auth.jwt();
begin
  new.uid := auth.uid();
  if new.uid is null or not coalesce(
    profile->'app_metadata'->>'provider'='google'
    or (profile->'app_metadata'->'providers') ? 'google'
    or (profile->'app_metadata'->>'provider'='email'
        and profile->'app_metadata'->>'role' in ('student','admin')),false)
    then raise exception 'ACCOUNT_LOGIN_REQUIRED'; end if;
  new.author := left(coalesce(nullif(profile->'user_metadata'->>'username',''),nullif(profile->'user_metadata'->>'full_name',''),
    nullif(profile->'user_metadata'->>'name',''), profile->>'email', new.uid::text), 180);
  new.status := 'pending';
  new.created_at := clock_timestamp();
  new.reviewed_at := null;
  new.reviewer := null;
  new.reason := null;
  new.approved_keys := '{}';
  new.rid := coalesce(new.rid,'');
  new.mid := coalesce(new.mid,'');
  new.method := coalesce(new.method,'');
  new.memo := coalesce(new.memo,'');
  new.photo := coalesce(new.photo,'');
  new.changes := coalesce(new.changes,'{}'::jsonb);
  if length(new.id) not between 1 and 150 or length(new.rid) > 170 or length(new.mid) > 170
     or length(new.memo) > 5000 or jsonb_typeof(new.changes) <> 'object'
     or octet_length(new.changes::text) > 24000 then raise exception 'INVALID_INPUT'; end if;

  case new.type
    when 'restaurant' then allowed := array['ko','en','lat','lng','phone','address','photo'];
    when 'menu' then allowed := ingredients || array['ko','en','photo'];
    when 'edit' then allowed := ingredients || array['en'];
    when 'close', 'end' then allowed := '{}'::text[];
    else raise exception 'UNKNOWN_REPORT_TYPE';
  end case;
  for field in select jsonb_object_keys(new.changes) loop
    if not field = any(allowed) then raise exception 'INVALID_FIELD: %',field; end if;
    if field = any(ingredients) then
      if jsonb_typeof(new.changes->field) <> 'string' or new.changes->>field not in ('yes','no','unknown') then
        raise exception 'INVALID_INGREDIENT';
      end if;
    elsif field in ('lat','lng') then
      if jsonb_typeof(new.changes->field) <> 'number' then raise exception 'INVALID_LOCATION'; end if;
    else
      if jsonb_typeof(new.changes->field) <> 'string' or length(new.changes->>field) > 500 then
        raise exception 'INVALID_TEXT';
      end if;
      new.changes := jsonb_set(new.changes,array[field],to_jsonb(btrim(new.changes->>field)));
    end if;
  end loop;

  foreach file_path in array array[new.photo,coalesce(new.changes->>'photo','')] loop
    if file_path <> '' and (split_part(file_path,'/',1) <> new.uid::text or
      not exists(select 1 from storage.objects o where o.bucket_id='evidence' and o.name=file_path))
    then raise exception 'EVIDENCE_UNAVAILABLE'; end if;
  end loop;

  if new.type = 'restaurant' then
    new.mid := '';
    if new.rid = '' then new.rid := 'restaurant-' || new.id; end if;
    if coalesce(new.changes->>'ko','')='' or not new.changes ?& array['lat','lng'] then raise exception 'NAME_AND_LOCATION_REQUIRED'; end if;
    if not public.itda_in_campus((new.changes->>'lat')::float8,(new.changes->>'lng')::float8)
      then raise exception 'OUTSIDE_CAMPUS'; end if;
    if exists(select 1 from public.restaurants r where r.id=new.rid) or public.itda_restaurant_nearby(
      new.changes->>'ko',(new.changes->>'lat')::float8,(new.changes->>'lng')::float8)
      then raise exception 'DUPLICATE_RESTAURANT'; end if;
    new.title := new.changes->>'ko';
  else
    select data into original from public.restaurants where id=new.rid and not hidden;
    if not found then raise exception 'RESTAURANT_UNAVAILABLE'; end if;
    new.title := original->>'ko';
    if new.type = 'menu' then
      if new.mid = '' then new.mid := 'menu-' || new.id; end if;
      if coalesce(new.changes->>'ko','')='' then raise exception 'MENU_NAME_REQUIRED'; end if;
      if exists (select 1 from public.menus m where m.id=new.mid or (not m.hidden and m.restaurant_id=new.rid
        and regexp_replace(m.data->>'ko','[[:space:]]+','','g') =
        regexp_replace(new.changes->>'ko','[[:space:]]+','','g'))) then raise exception 'DUPLICATE_MENU'; end if;
      new.title := new.title || ' · ' || (new.changes->>'ko');
    elsif new.type in ('edit','end') then
      select data into original from public.menus where id=new.mid and restaurant_id=new.rid and not hidden;
      if not found then raise exception 'MENU_UNAVAILABLE'; end if;
      new.title := new.title || ' · ' || (original->>'ko');
      if new.type = 'edit' then
        for field in select jsonb_object_keys(new.changes) loop
          if new.changes->field is distinct from (case when field=any(ingredients)
             then coalesce(original->'ingredients'->field,'"unknown"'::jsonb) else coalesce(original->field,'""'::jsonb) end)
          then patch := patch || jsonb_build_object(field,new.changes->field); end if;
        end loop;
        new.changes := patch;
        if patch='{}' then raise exception 'NO_CHANGES'; end if;
      end if;
    else
      new.mid := '';
    end if;
  end if;
  if (new.type='edit' or new.changes ?| ingredients) and new.method not in ('staff','label','self')
    then raise exception 'METHOD_REQUIRED'; end if;
  return new;
end
$$;
drop trigger if exists itda_before_report on public.reports;
create trigger itda_before_report before insert on public.reports
for each row execute function public.itda_validate_report();

create or replace function public.review_report(p_id text,p_approve boolean,p_keys text[],p_reason text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  record public.reports%rowtype;
  doc jsonb;
  prior jsonb;
  key text;
  keys text[];
  effective text[] := '{}';
  admin_name text;
  checked_at timestamptz := clock_timestamp();
  ingredients text[] := public.itda_ingredients();
begin
  if auth.uid() is null or not public.itda_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode='42501';
  end if;
  if p_approve is null then raise exception 'INVALID_DECISION'; end if;
  select * into strict record from public.reports where id=p_id for update;
  if record.status not in ('pending','failed') then raise exception 'ALREADY_REVIEWED'; end if;
  admin_name := coalesce(nullif(auth.jwt()->'user_metadata'->>'full_name',''),auth.jwt()->>'email',auth.uid()::text);
  if not p_approve then
    if nullif(btrim(p_reason),'') is null then raise exception 'REJECTION_REASON_REQUIRED'; end if;
    update public.reports set status='rejected', reason=left(btrim(p_reason),2000), reviewer=admin_name,
      reviewed_at=checked_at, approved_keys='{}' where id=p_id;
    return 'rejected';
  end if;

  select coalesce(array_agg(distinct v),'{}'::text[]) into keys from unnest(p_keys) as k(v);
  if exists(select 1 from unnest(keys) as k(v) where v is null or not record.changes ? v)
    then raise exception 'INVALID_APPROVAL_KEYS'; end if;
  if record.type in ('restaurant','menu','edit') and cardinality(keys)=0 then raise exception 'SELECT_FIELDS'; end if;
  if record.type = 'restaurant' and not keys @> array['ko','lat','lng'] then raise exception 'NAME_AND_LOCATION_REQUIRED'; end if;
  if record.type = 'menu' and not 'ko' = any(keys) then raise exception 'MENU_NAME_REQUIRED'; end if;

  -- Serialize all catalog changes for a restaurant, including updates on different
  -- reports, so closing the restaurant and adding a menu cannot cross in flight.
  perform pg_advisory_xact_lock(hashtextextended('itda:restaurant:'||record.rid,0));
  begin
    if record.type = 'restaurant' then
      perform pg_advisory_xact_lock(hashtextextended('itda:name:'||
        regexp_replace(record.changes->>'ko','[[:space:]]+','','g'),0));
      if public.itda_restaurant_nearby(record.changes->>'ko',
           (record.changes->>'lat')::float8,(record.changes->>'lng')::float8) then
        raise exception 'DUPLICATE_RESTAURANT'; end if;
      doc := jsonb_build_object('id',record.rid,'en','','address','','addressEn','','phone','','photo','',
        'category','','categoryEn','');
      foreach key in array keys loop doc := doc || jsonb_build_object(key, record.changes->key); end loop;
      insert into public.restaurants(id,data) values (record.rid,doc);
      effective := keys;
    else
      if not exists(select 1 from public.restaurants r where r.id=record.rid and not r.hidden)
        then raise exception 'RESTAURANT_UNAVAILABLE'; end if;
      if record.type = 'close' then
        update public.restaurants set hidden=true where id=record.rid;
      elsif record.type = 'end' then
        update public.menus set hidden=true where id=record.mid and restaurant_id=record.rid and not hidden;
        if not found then raise exception 'MENU_UNAVAILABLE'; end if;
      else
        if record.type = 'menu' then
          doc := jsonb_build_object('id',record.mid,'rid',record.rid,'en','','photo','','evidence','{}'::jsonb,
            'ingredients',(select jsonb_object_agg(i,'unknown'::text) from unnest(ingredients) as t(i)));
        else
          select m.data into doc from public.menus m
            where m.id=record.mid and m.restaurant_id=record.rid and not m.hidden for update;
          if not found then raise exception 'MENU_UNAVAILABLE'; end if;
          doc := doc || jsonb_build_object('ingredients',coalesce(doc->'ingredients','{}'::jsonb),
            'evidence',coalesce(doc->'evidence','{}'::jsonb));
        end if;
        foreach key in array keys loop
          if key = any(ingredients) then
            prior := doc->'evidence'->key;
            -- Compare individual fields. A stronger or equally strong newer
            -- conflicting submission must be reviewed before the weaker claim.
            if exists (
              select 1 from public.reports other where other.id<>record.id and other.mid=record.mid
                and other.rid=record.rid and other.type='edit' and other.status='pending'
                and other.changes ? key and other.changes->key <> record.changes->key
                and (public.itda_method_rank(other.method),other.created_at,other.id) >
                  (public.itda_method_rank(record.method),record.created_at,record.id)
            ) then continue; end if;
            -- Do not overwrite provenance from a stronger approved report, even
            -- if the older report happens to be reviewed later.
            if prior ? 'submittedAt' and
              (public.itda_method_rank(prior->>'method'),(prior->>'submittedAt')::timestamptz,prior->>'reportId') >
              (public.itda_method_rank(record.method),record.created_at,record.id) then continue; end if;
            doc := jsonb_set(doc,array['ingredients',key],record.changes->key);
            doc := jsonb_set(doc,array['evidence',key],jsonb_build_object('method',record.method,
              'date',to_char(record.created_at at time zone 'Asia/Seoul','YYYY-MM-DD'),
              'submittedAt',record.created_at,'reportId',record.id));
          else
            doc := jsonb_set(doc,array[key],record.changes->key);
          end if;
          effective := array_append(effective,key);
        end loop;
        if cardinality(effective)=0 then raise exception 'HIGHER_PRIORITY_REPORT'; end if;
        if record.type = 'menu' then
          insert into public.menus(id,data) values(record.mid,doc);
        else
          update public.menus set data=doc where id=record.mid;
        end if;
      end if;
    end if;
    update public.reports set status='approved', reason=null, reviewed_at=checked_at, reviewer=admin_name,
      approved_keys=effective where id=p_id;
    return 'approved';
  exception when others then
    -- PL/pgSQL rolls this inner transaction back, including any catalog writes.
    -- The failure remains available to the same review RPC for a safe retry.
    update public.reports set status='failed', reviewed_at=checked_at, reviewer=admin_name, approved_keys='{}',
      reason=case when sqlstate='23505' then 'DUPLICATE_RECORD'
        when sqlstate='P0001' then sqlerrm else 'APPLY_FAILED' end where id=p_id;
    return 'failed';
  end;
end
$$;

revoke all on function public.review_report(text,boolean,text[],text) from public,anon;
grant execute on function public.review_report(text,boolean,text[],text) to authenticated;
revoke all on function public.itda_validate_report(), public.itda_method_rank(text),
  public.itda_ingredients(), public.itda_in_campus(float8,float8),
  public.itda_restaurant_nearby(text,float8,float8) from public,anon,authenticated;
grant execute on function public.itda_is_admin() to anon,authenticated;

commit;
