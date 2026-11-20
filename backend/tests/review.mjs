import {PGlite} from '@electric-sql/pglite'
import fs from 'node:fs'
import assert from 'node:assert/strict'
const d=new PGlite()
await d.exec(`
create schema auth; create schema storage; create role anon; create role authenticated; create role service_role bypassrls;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select (current_setting('test.jwt',true)::jsonb->>'sub')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select current_setting('test.jwt',true)::jsonb$$;
create table storage.buckets(id text primary key,name text,public bool,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
alter table storage.objects enable row level security; grant usage on schema auth,storage to anon,authenticated;
grant select,insert on storage.objects to authenticated; grant select on storage.objects to anon;
grant usage on schema public to anon,authenticated;
`)
const setup=fs.readFileSync(new URL('../setup.sql', import.meta.url),'utf8')
await d.exec(setup)
await d.exec(setup)
const u='00000000-0000-4000-a000-000000000001',a='00000000-0000-4000-a000-000000000002'
await d.query('insert into auth.users values ($1),($2)',[u,a])
async function role(id,provider='email'){
 await d.exec('reset role')
 const jwt={sub:id,user_metadata:{full_name:id===u?'Student':'Moderator'},app_metadata:{provider,role:id===a?'admin':'student'}}
 await d.query("select set_config('test.jwt',$1,false)",[JSON.stringify(jwt)])
 await d.exec('set role '+(id?'authenticated':'anon'))
}
async function rows(q,p=[]){return (await d.query(q,p)).rows}
async function submit(id,type,attrs={}){
 const payload={id,type,rid:'r',mid:'',changes:{},...attrs}
 const ks=Object.keys(payload)
 return d.query('insert into public.reports('+ks.join(',')+') values ('+ks.map((_,i)=>'$'+(i+1)).join(',')+')',Object.values(payload).map(v=>(typeof v==='object'?JSON.stringify(v):v)))
}
async function review(id,approve,keys,reason=''){
 const [{review_report}]=await rows('select public.review_report($1,$2,$3,$4)',[id,approve,keys,reason]);return review_report
}
const quota=fs.readFileSync(new URL('../signup-limit.sql',import.meta.url),'utf8')
await d.exec(quota)
await d.exec(quota)
await d.exec('set role authenticated')
await assert.rejects(()=>rows("select public.itda_allow_signup(repeat('0',64))"),/permission denied/)
await d.exec('reset role; set role service_role')
for(let i=0;i<11;i++){
 const [entry]=await rows("select public.itda_allow_signup(repeat('0',64)) as allowed")
 assert.equal(entry.allowed,i<10)
}
await role(u,'google')
await d.exec('begin')
await submit('legacy-google','restaurant',{rid:'legacy',changes:{ko:'Test',lat:37.46,lng:126.95}})
await d.exec('rollback')
await role(u)
await submit('r-request','restaurant',{changes:{ko:'Test',lat:37.46,lng:126.95},status:'approved',reviewer:'forged',author:'forged'})
assert.deepEqual(await rows('select author,status,reviewer from public.reports'),[{author:'Student',status:'pending',reviewer:null}])
await assert.rejects(()=>review('r-request',true,['ko','lat','lng']),/ADMIN_REQUIRED/)
await role(null)
assert.deepEqual(await rows('select * from public.reports'),[])
assert.deepEqual(await rows('select * from public.restaurants'),[])
await role(a)
assert.equal(await review('r-request',true,['ko','lat','lng']),'approved')
await assert.rejects(()=>review('r-request',false,[],'Reason'),/ALREADY_REVIEWED/)
await role(u)
await assert.rejects(()=>submit('bad-area','restaurant',{rid:'out',changes:{ko:'Out',lat:35,lng:124}}),/OUTSIDE_CAMPUS/)
await assert.rejects(()=>submit('r-dup','restaurant',{rid:'near',changes:{ko:'T e s t',lat:37.46001,lng:126.95}}),/DUPLICATE_RESTAURANT/)
await submit('m-request','menu',{mid:'m',changes:{ko:'Test Menu',pork:'unknown',egg:'yes'},method:'self'})
await role(a)
assert.equal(await review('m-request',true,['ko','pork','egg']),'approved')
await role(u)
await submit('weak','edit',{mid:'m',changes:{pork:'no',egg:'no'},method:'label'})
await submit('strong','edit',{mid:'m',changes:{pork:'yes'},method:'staff'})
await submit('reject','edit',{mid:'m',changes:{dairy:'yes'},method:'self'})
await assert.rejects(()=>submit('invalid','edit',{mid:'m',changes:{egg:'yes'},method:'self'}),/NO_CHANGES/)
await assert.rejects(()=>submit('no-method','edit',{mid:'m',changes:{seafood:'no'}}),/METHOD_REQUIRED/)
await role(a)
assert.equal(await review('weak',true,['pork','egg']),'approved')
assert.deepEqual((await rows("select approved_keys from public.reports where id='weak'"))[0].approved_keys,['egg'])
assert.equal(await review('strong',true,['pork']),'approved')
assert.equal(await review('reject',false,[],'Duplicate'),'rejected')
assert.equal((await rows("select data from public.menus"))[0].data.ingredients.pork,'yes')
await role(u)
await submit('retry','edit',{mid:'m',method:'self',changes:{dairy:'yes'}})
await submit('competitor','edit',{mid:'m',method:'label',changes:{dairy:'no'}})
await role(a)
assert.equal(await review('retry',true,['dairy']),'failed')
assert.equal(await review('competitor',false,[],'Insufficient evidence'),'rejected')
assert.equal(await review('retry',true,['dairy']),'approved')
await role(u)
await assert.rejects(()=>submit('bad-photo','menu',{mid:'m2',changes:{ko:'Pic',photo:a+'/p.jpg'}}),/EVIDENCE_UNAVAILABLE/)
await d.query('insert into storage.objects(bucket_id,name) values ($1,$2)',['evidence',u+'/pic.jpg'])
await submit('photo-menu','menu',{mid:'m2',changes:{ko:'Pic',photo:u+'/pic.jpg'}})
await role(null)
assert.equal((await rows('select * from storage.objects')).length,0)
await role(a)
assert.equal((await rows('select * from storage.objects')).length,1)
assert.equal(await review('photo-menu',true,['ko','photo']),'approved')
await role(null)
assert.equal((await rows('select * from storage.objects')).length,1)
await role(u)
await submit('close','close')
await assert.rejects(()=>submit('close-dup','close'),/unique|duplicate/i)
await role(a)
assert.equal(await review('close',true,[]),'approved')
await role(null)
assert.equal((await rows('select * from storage.objects')).length,0)
assert.equal((await rows('select * from public.menus')).length,0)
assert.equal((await rows('select * from public.restaurants')).length,0)
// Reviewer intake (INP-10~12): an admin files the same validated reports and approves them,
// so campus, duplicate and method checks still apply and the history records both roles.
await role(a)
await assert.rejects(()=>submit('admin-out','restaurant',{rid:'admin-out',changes:{ko:'Off',lat:37.48,lng:126.94}}),/OUTSIDE_CAMPUS/)
await submit('admin-r','restaurant',{rid:'admin-r',changes:{ko:'Admin Cafe',lat:37.452,lng:126.952,phone:'02-1'}})
assert.equal(await review('admin-r',true,['ko','lat','lng','phone']),'approved')
await submit('admin-m','menu',{rid:'admin-r',mid:'admin-m',changes:{ko:'Admin Menu'}})
assert.equal(await review('admin-m',true,['ko']),'approved')
await assert.rejects(()=>submit('admin-dup','menu',{rid:'admin-r',mid:'admin-m2',changes:{ko:'AdminMenu'}}),/DUPLICATE_MENU/)
await assert.rejects(()=>submit('admin-nomethod','edit',{rid:'admin-r',mid:'admin-m',changes:{pork:'yes'}}),/METHOD_REQUIRED/)
await submit('admin-e','edit',{rid:'admin-r',mid:'admin-m',changes:{pork:'yes',dairy:'no'},method:'label',memo:'https://example.com/allergy'})
assert.equal(await review('admin-e',true,['pork','dairy']),'approved')
assert.deepEqual((await rows("select author,reviewer,status from public.reports where id like 'admin-%' order by id")).map(r=>[r.author,r.reviewer,r.status]),
 [['Moderator','Moderator','approved'],['Moderator','Moderator','approved'],['Moderator','Moderator','approved']])
await role(null)
const [adminMenu]=await rows("select data from public.menus where id='admin-m'")
assert.deepEqual([adminMenu.data.ingredients.pork,adminMenu.data.ingredients.dairy,adminMenu.data.ingredients.egg,adminMenu.data.evidence.pork.method],['yes','no','unknown','label'])
console.log('Passed Supabase migration and idempotence on local PostgreSQL WASM; filtered RLS reads, forgery, admin role, partial approval, priority, subtransaction rollback and retry, duplicate/location validation, private/public photo lifecycle, and hidden parents verified.')
await d.close()
