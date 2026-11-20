import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
import {within,fireEvent} from '@testing-library/dom';
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(String(e)));
const dom=new JSDOM(fs.readFileSync(new URL('../dist/index.html', import.meta.url),'utf8'),{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 Object.assign(w,{structuredClone,ResizeObserver:class {observe(){}disconnect(){}},scrollTo:()=>{},TextDecoder,TextEncoder,Response,Request,Headers,fetch,WebSocket});
 w.localStorage.setItem('itda.lang','ko')
}});
const w=dom.window,d=w.document,ui=within(d.body),sleep=()=>new Promise(r=>setTimeout(r,50));
async function wait(fn){for(let i=0;i<50;i++){try{const val=fn();if(val)return val}catch{}await sleep()}throw new Error('Timed out: '+fn+'\n'+errors.join('\n')+'\n'+d.body.textContent.slice(-2000))}
const btn=(n)=>ui.getByRole('button',{name:n,exact:true});
async function click(el){fireEvent.click(el);await sleep()}
const count=()=>d.querySelectorAll('.result').length;
await wait(()=>count()===6);await click(btn('돼지고기 없음'));await click(btn('해산물 없음'));
assert.ok(count()<6&&count()>0);assert.ok(![...d.querySelectorAll('.result')].some(x=>x.textContent.includes('한칸 샌드')));assert.equal(d.querySelectorAll('.itda-map-pin').length,count());
await click(btn('초기화'));await click(btn('초록한끼'));await click(btn('메뉴 추가하기'));await click(btn('학생으로 체험하기'));
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
fireEvent.change(ui.getByLabelText('확인 방법',{exact:true}),{target:{value:'staff'}});await click(btn('제보 제출하기'));await wait(()=>d.querySelector('.reportRow'));assert.match(d.querySelector('.reportRow').textContent,/검토 대기/);let db=JSON.parse(w.localStorage.getItem('itda.preview.catalog.v1'));assert.equal(db.menus.length,14);
await click(btn('로그아웃'));await click(btn('로그인'));await click(btn('운영진으로 체험하기'));await click(btn('내 계정'));await click(btn('운영진 검토함'));await click(d.querySelector('.reportRow'));await click(btn('선택 항목 승인'));await wait(()=>!d.querySelector('[role=dialog]'));db=JSON.parse(w.localStorage.getItem('itda.preview.catalog.v1'));assert.equal(db.menus.length,15);const {pork, beef, chicken, other} = db.menus.at(-1).ingredients;
assert.deepEqual([pork, beef, chicken, other], ['unknown', 'yes', 'yes', 'unknown']);
assert.equal(db.reports.at(-1).memo, '');
assert.equal(db.reports.at(-1).status,'approved');
await click(btn('식당 찾기'));fireEvent.change(ui.getByLabelText('검색 대상'),{target:{value:'menu'}});fireEvent.change(ui.getByLabelText('검색어'),{target:{value:'테스트'}});await sleep();assert.equal(count(),1);assert.match(d.querySelector('.result').textContent,/초록한끼/);
await click(btn('Switch to English'));assert.equal(w.localStorage.getItem('itda.lang'),'en');assert.ok(ui.getByRole('heading',{name:'Campus food finder.'}));assert.deepEqual(errors,[]);
console.log('PASS: 6 restaurants, 14 menus, multi-filter same-menu rule, map/list synchronized, authenticated form continuity, method validation, pending isolation, approval publication, menu search, language preference, no DOM execution errors');
w.close();

const connectedHtml = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8')
  .replace(/window\.ITDA_CONFIG=[^<]+/, 'window.ITDA_CONFIG={"supabaseUrl":"https://itda-test.supabase.co","supabaseAnonKey":"test-key"}');
const callback = new JSDOM(connectedHtml, {
  url: 'http://localhost/?error=access_denied&error_description=cancelled',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(window) {
    Object.assign(window, {
      structuredClone, TextDecoder, TextEncoder, Response, Request, Headers, WebSocket,
      ResizeObserver: class { observe() {} disconnect() {} },
      scrollTo: () => {},
      fetch: async () => Response.json([]),
    });
    window.localStorage.setItem('itda.lang', 'ko');
    window.sessionStorage.setItem('itda.return', JSON.stringify({
      origin: { page: 'restaurant', id: 'example' },
      target: { page: 'form', type: 'add', rid: 'example' },
    }));
  },
});
try {
  const callbackWindow = callback.window;
  const callbackUi = within(callbackWindow.document.body);
  await wait(() => callbackUi.queryByRole('alert'));
  assert.match(callbackUi.getByRole('alert').textContent, /로그인에 실패/);
  assert.equal(callbackUi.getByRole('button', { name: 'Google 계정으로 로그인' }).disabled, false);
  assert.equal(callbackWindow.location.search, '');
  assert.equal(callbackWindow.location.hash, '#page=restaurant&id=example');
  assert.equal(callbackWindow.sessionStorage.getItem('itda.return'), null);
  assert.deepEqual(errors, []);
  console.log('PASS: cancelled Google sign-in restores the previous route and offers retry');
} finally {
  callback.window.close();
}
