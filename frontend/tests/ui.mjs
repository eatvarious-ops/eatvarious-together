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
let input=ui.getByLabelText('메뉴 이름 (한글) *');fireEvent.change(input,{target:{value:'테스트 메뉴'}});fireEvent.change(ui.getByLabelText('돼지고기',{exact:true}),{target:{value:'no'}});await click(btn('제보 제출하기'));assert.match(d.body.textContent,/확인 방법을 선택해주세요/);
fireEvent.change(ui.getByLabelText('확인 방법',{exact:true}),{target:{value:'staff'}});await click(btn('제보 제출하기'));await wait(()=>d.querySelector('.reportRow'));assert.match(d.querySelector('.reportRow').textContent,/검토 대기/);let db=JSON.parse(w.localStorage.getItem('itda.preview.catalog.v1'));assert.equal(db.menus.length,14);
await click(btn('로그아웃'));await click(btn('로그인'));await click(btn('운영진으로 체험하기'));await click(btn('내 계정'));await click(btn('운영진 검토함'));await click(d.querySelector('.reportRow'));await click(btn('선택 항목 승인'));await wait(()=>!d.querySelector('[role=dialog]'));db=JSON.parse(w.localStorage.getItem('itda.preview.catalog.v1'));assert.equal(db.menus.length,15);assert.equal(db.menus.at(-1).ingredients.pork,'no');assert.equal(db.reports.at(-1).status,'approved');
await click(btn('식당 찾기'));fireEvent.change(ui.getByLabelText('검색 대상'),{target:{value:'menu'}});fireEvent.change(ui.getByLabelText('검색어'),{target:{value:'테스트'}});await sleep();assert.equal(count(),1);assert.match(d.querySelector('.result').textContent,/초록한끼/);
await click(btn('Switch to English'));assert.equal(w.localStorage.getItem('itda.lang'),'en');assert.ok(ui.getByRole('heading',{name:'Campus food finder.'}));assert.deepEqual(errors,[]);
console.log('PASS: 6 restaurants, 14 menus, multi-filter same-menu rule, map/list synchronized, authenticated form continuity, method validation, pending isolation, approval publication, menu search, language preference, no DOM execution errors');
w.close();
