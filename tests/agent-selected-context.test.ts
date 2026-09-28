import assert from 'node:assert/strict';
import test from 'node:test';
import { formatAgentCaseIdentity, formatSelectedAgentContext, MAX_SELECTED_CONTEXT_TEXT } from '../lib/agent/selected-context';
import { buildAgentSystemPrompt } from '../lib/agent/system-prompt';
import { restoreAgentSessionContext } from '../lib/agent/session-context';
import { prisma } from '../lib/prisma';
import { runAgentTurn } from '../lib/agent/runner';

const makeCase = (id: string, name: string, size = 40_000) => ({
  id, title: name, modelType: 'bazi',
  chartParams: { name, sex: 0, year: 2001, month: 4, day: 22, hours: 0, minute: 0, calendarType: 'lunar', isLeapMonth: false, useTrueSolar: false },
  chartData: { taibuText: '盘'.repeat(size), base_info: { name, sex: '男', gongli: '2001-05-14 00:00', nongli: '二〇〇一年四月廿二' }, bazi_info: { bazi: ['辛巳', '癸巳', '丁丑', '庚子'] }, dayun_info: { big: [] } },
});
const a = makeCase('case-a', '测试甲');
const b = makeCase('case-b', '测试乙');

test('oversized first chart cannot erase the second referenced case or its birth parameters', () => {
  const old = [a, b].map(item => `${item.title} ${item.id}\n${JSON.stringify(item.chartData)}`).join('\n\n').slice(0, 18_000);
  assert.ok(!old.includes('case-b'));
  const text = formatSelectedAgentContext({ caseIds: [a.id, b.id], sessionIds: [], cases: [b, a], sessions: [] });
  assert.ok(text.length <= MAX_SELECTED_CONTEXT_TEXT);
  assert.ok(text.indexOf('caseId=case-a') < text.indexOf('caseId=case-b'));
  assert.ok(text.indexOf('caseId=case-b') < text.indexOf('【命例排盘摘要'));
  for (const item of [a, b]) assert.ok(text.includes(`"name":"${item.title}"`));
  assert.match(text, /"hours":0,"minute":0/);
  assert.match(text, /"calendarType":"lunar"/);
  assert.match(text, /四柱：辛巳 癸巳 丁丑 庚子/);
  assert.ok(!text.includes('盘'.repeat(100)));
});

test('four cases and four large sessions each retain their identity and bounded share', () => {
  const cases = Array.from({length:4}, (_, i) => makeCase(`case-${i}`, `测试${i}`));
  const sessions = Array.from({length:4}, (_, i) => ({ id:`session-${i}`, title:`会话${i}`, messages:[{role:'user',content:'问'.repeat(60_000)}] }));
  const text = formatSelectedAgentContext({caseIds:cases.map(x=>x.id),sessionIds:sessions.map(x=>x.id),cases,sessions});
  assert.ok(text.length <= MAX_SELECTED_CONTEXT_TEXT, String(text.length));
  for (const item of cases) assert.ok(text.includes(`【命例排盘摘要｜caseId=${item.id}】`));
  for (const item of sessions) assert.ok(text.includes(`【会话摘录｜sessionId=${item.id}】`));
});

test('missing records are explicit and unselected records never enter the prompt', () => {
  const text = formatSelectedAgentContext({caseIds:['missing',a.id,a.id],sessionIds:['missing-session'],cases:[a,b],sessions:[]});
  assert.match(text,/未找到当前用户可访问的记录/);
  assert.ok(!text.includes(b.title));
  assert.equal(text.match(/【已引用命例/g)?.length,1);
  const missingBirth = formatAgentCaseIdentity({...a,chartParams:null,chartData:null});
  assert.match(missingBirth,/：\{\}/);
  assert.ok(!missingBirth.includes('"sex":0'));
});

test('current references take precedence over old missing-data replies and guide compatibility tools', () => {
  const prompt=buildAgentSystemPrompt({selectedContext:formatSelectedAgentContext({caseIds:[a.id,b.id],sessionIds:[],cases:[a,b],sessions:[]})});
  assert.match(prompt,/合盘（包括“和盘”）/);
  assert.match(prompt,/bazi_compatibility/);
  assert.match(prompt,/优先于历史回复/);
});

test('Agent provider receives both references, compatibility reads owned records, and session references refresh', async (t) => {
  const priorKey=process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY='test-only';
  t.after(()=>{ if(priorKey===undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY=priorKey; });
  const stub = (target: any, key: string, fn: (...args: any[]) => any) => { const original = target[key]; target[key] = fn; assert.equal(target[key], fn); t.after(() => { target[key] = original; }); };
  const owner='test-owner';
  stub(prisma.divinationCase,'findMany',async ({where}:any)=>{assert.equal(where.userId,owner);assert.deepEqual(where.id.in,[a.id,b.id]);return [b,a];});
  stub(prisma.divinationCase,'findFirst',async ({where}:any)=>{assert.equal(where.userId,owner);return [a,b].find(x=>x.id===where.id)??null;});
  stub(prisma.chatMessage,'findMany',async()=>[{role:'model',content:'还缺测试乙的出生资料。'}]);
  stub(prisma.chatMessage,'create',async()=>({}));
  stub(prisma.user,'updateMany',async()=>({count:1}));
  stub(prisma.user,'findUnique',async()=>({quota:99}));
  stub(prisma.agentTurn,'update',async()=>({}));
  stub(prisma.agentToolRun,'create',async()=>({id:'tool-run'}));
  stub(prisma.agentToolRun,'update',async()=>({}));
  stub(prisma.agentToolRun,'findMany',async()=>[]);
  stub(prisma.caseRelation,'findMany',async()=>[]);
  stub(prisma.divinationSession,'findUnique',async()=>({chartParams:{sourceCaseIds:[a.id],custom:'keep'}}));
  let saved:any;
  stub(prisma.divinationSession,'update',async ({data}:any)=>{saved=data.chartParams;return {};});
  stub(prisma,'$transaction',async (fn:any)=>fn(prisma));
  let requests=0;
  stub(globalThis,'fetch',async (_url:any,init:any)=>{
    const body=JSON.parse(init.body); requests++;
    if(requests===1){
      const system=body.messages[0].content;
      assert.ok(system.includes(`caseId=${a.id}`)&&system.includes(`caseId=${b.id}`));
      assert.ok(system.includes('"hours":0'));
      return Response.json({choices:[{message:{role:'assistant',content:null,tool_calls:[{id:'compat-call',type:'function',function:{name:'bazi_compatibility',arguments:JSON.stringify({caseAId:a.id,caseBId:b.id})}}]}}]});
    }
    assert.equal(requests,2);
    const result=body.messages.find((m:any)=>m.role==='tool').content;
    assert.ok(result.includes(a.title)&&result.includes(b.title));
    return Response.json({choices:[{message:{role:'assistant',content:'已读取两位的完整命例进行合盘。'}}]});
  });
  const result=await runAgentTurn({userId:owner,sessionId:'test-session',turnId:'test-turn',message:'那你和盘一下',selectedCaseIds:[a.id,b.id],selectedSessionIds:[],knowledgeEnabled:false,emit:()=>{}});
  assert.equal(requests,2);
  assert.match(result.content,/已读取两位/);
  assert.deepEqual(saved.sourceCaseIds,[a.id,b.id]);
  assert.equal(saved.custom,'keep');
});


test('old Agent sessions restore the latest selected references, including explicit removal', () => {
  const original={type:'agent_chat',sourceCaseIds:['case-a'],sourceSessionIds:[],knowledgeEnabled:false};
  const messages=[{role:'user',metadata:{selectedCaseIds:['case-a'],selectedSessionIds:[]}},{role:'user',metadata:{selectedCaseIds:['case-a','case-b'],selectedSessionIds:['session-c']}},{role:'model',metadata:{aiCalls:1}}];
  assert.deepEqual(restoreAgentSessionContext(original,messages),{...original,sourceCaseIds:['case-a','case-b'],sourceSessionIds:['session-c']});
  assert.deepEqual(restoreAgentSessionContext(original,[...messages,{role:'user',metadata:{selectedCaseIds:[],selectedSessionIds:[]}}]),{...original,sourceCaseIds:[],sourceSessionIds:[]});
  assert.equal(restoreAgentSessionContext(original,[]),original);
  const ordinary={type:'standalone_chat',sourceCaseIds:['ordinary']};
  assert.equal(restoreAgentSessionContext(ordinary,messages),ordinary);
});
