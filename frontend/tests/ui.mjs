import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalog,mockFetch} from './account-api.mjs';
import {JSDOM,VirtualConsole} from 'jsdom';
import {within,fireEvent} from '@testing-library/dom';
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(String(e)));
const dom=new JSDOM(fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8').replace(/window\.ITDA_CONFIG=[^<]+/, 'window.ITDA_CONFIG={"supabaseUrl":"https://itda-test.supabase.co","supabaseAnonKey":"test-public"}'),{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 Object.assign(w,{structuredClone,ResizeObserver:class {observe(){}disconnect(){}},scrollTo:()=>{},TextDecoder,TextEncoder,Response,Request,Headers,fetch:mockFetch,WebSocket});
 w.localStorage.setItem('itda.lang','ko')
}});
const w=dom.window,d=w.document,ui=within(d.body),sleep=()=>new Promise(r=>setTimeout(r,50));
async function wait(fn){for(let i=0;i<50;i++){try{const val=fn();if(val)return val}catch{}await sleep()}throw new Error('Timed out: '+fn+'\n'+errors.join('\n')+'\n'+d.body.textContent.slice(-2000))}
const btn=(n)=>ui.getByRole('button',{name:n,exact:true});
async function click(el){fireEvent.click(el);await sleep()}
const count=()=>d.querySelectorAll('.result').length;
await wait(()=>count()===6);await click(btn('돼지고기 없음'));await click(btn('해산물 없음'));
assert.ok(count()<6&&count()>0);assert.ok(![...d.querySelectorAll('.result')].some(x=>x.textContent.includes('한칸 샌드')));assert.equal(d.querySelectorAll('.itda-map-pin').length,count());
await click(btn('초기화'));await click(btn('초록한끼'));await click(btn('메뉴 추가하기'));await click(btn('회원가입'));
const form=()=>within(d.querySelector('.accountPane form'));
const fill=(index,value)=>fireEvent.change(d.querySelectorAll('.accountPane input')[index],{target:{value}});
const submit=async name=>{await click(form().getByRole('button',{name,exact:true}));};
fill(0,'student');fill(1,'fixture-student');fill(2,'typo');await submit('학생 회원가입');assert.match(d.body.textContent,/일치하지 않아요/);
fill(2,'fixture-student');await submit('학생 회원가입');assert.match(d.body.textContent,/학생 계정이 만들어졌어요/);
fill(1,'fixture-wrong');await submit('로그인');assert.match(d.body.textContent,/아이디 또는 비밀번호를 확인/);
fill(1,'fixture-student');await submit('로그인');
let input=ui.getByLabelText('메뉴 이름 (한글) *');fireEvent.change(input,{target:{value:'테스트 메뉴'}});
const meatGroup = within(ui.getByRole('group', {name: '고기', exact: true}));
const meat = name => meatGroup.getByRole('button', {name, exact: true});
const selected = name => meat(name).getAttribute('aria-pressed') === 'true';
assert.ok(selected('고기 미확인'));
await click(meat('고기 포함 · 종류 모름'));
assert.ok(selected('고기 포함 · 종류 모름'));
await click(btn('제보 제출하기'));
assert.match(d.body.textContent, /확인 방법을 선택해주세요/);
await click(meat('고기 없음'));
assert.ok(selected('고기 없음'));
await click(meat('소고기'));
await click(meat('닭고기'));
await click(meat('기타 고기'));
await click(meat('기타 고기'));
assert.ok(selected('소고기') && selected('닭고기') && !selected('기타 고기'));
assert.ok(!selected('고기 없음') && !selected('고기 포함 · 종류 모름'));
await click(btn('제보 제출하기'));assert.match(d.body.textContent,/확인 방법을 선택해주세요/);
fireEvent.change(ui.getByLabelText('확인 방법',{exact:true}),{target:{value:'staff'}});await click(btn('제보 제출하기'));await wait(()=>d.querySelector('.reportRow'));assert.match(d.querySelector('.reportRow').textContent,/검토 대기/);let db=catalog;assert.equal(db.menus.length,14);
await click(btn('로그아웃'));await click(btn('로그인'));fill(0,'reviewer');fill(1,'fixture-reviewer');await submit('로그인');await click(btn('내 계정'));await click(btn('운영진 검토함'));await click(d.querySelector('.reportRow'));await click(btn('선택 항목 승인'));await wait(()=>!d.querySelector('[role=dialog]'));db=catalog;assert.equal(db.menus.length,15);const {pork, beef, chicken, other} = db.menus.at(-1).ingredients;
assert.deepEqual([pork, beef, chicken, other], ['unknown', 'yes', 'yes', 'unknown']);
assert.equal(db.reports.at(-1).memo, '');
assert.equal(db.reports.at(-1).status,'approved');
await click(btn('식당 찾기'));fireEvent.change(ui.getByLabelText('검색 대상'),{target:{value:'menu'}});fireEvent.change(ui.getByLabelText('검색어'),{target:{value:'테스트'}});await sleep();assert.equal(count(),1);assert.match(d.querySelector('.result').textContent,/초록한끼/);
await click(btn('Switch to English'));assert.equal(w.localStorage.getItem('itda.lang'),'en');assert.ok(ui.getByRole('heading',{name:'Campus food finder.'}));assert.deepEqual(errors,[]);
console.log('PASS: 6 restaurants, 14 menus, multi-filter same-menu rule, map/list synchronized, authenticated form continuity, method validation, pending isolation, approval publication, menu search, language preference, no DOM execution errors');
w.close();

