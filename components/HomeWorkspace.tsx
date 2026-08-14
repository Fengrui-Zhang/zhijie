import React, { useState } from 'react';

type PrimaryCase = {
  id: string;
  title: string;
  summary: string;
  detail: string;
};

type Props = {
  primaryCase?: PrimaryCase;
  hasBaziCase: boolean;
  onOpenCase: () => void;
  onCreateBazi: () => void;
  onCreateZiwei: () => void;
  onOpenDaily: () => void;
  onOpenDivination: (type: 'qimen' | 'liuyao' | 'meihua' | 'daliuren' | 'taiyi' | 'xiaoliuren') => void;
  onOpenAlmanac: () => void;
  onOpenChat: () => void;
  onOpenRecords: () => void;
};

type IconName = 'chart' | 'sun' | 'divination' | 'calendar' | 'chat' | 'record';

const TaskIcon = ({ name }: { name: IconName }) => {
  const common = 'h-6 w-6';
  if (name === 'chart') return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></svg>;
  if (name === 'sun') return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></svg>;
  if (name === 'divination') return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="6" y="3" width="12" height="18" rx="6" /><circle cx="12" cy="8" r="1.5" /><circle cx="12" cy="16" r="1.5" /><path d="M6 12h12" /></svg>;
  if (name === 'calendar') return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M7 14h3M14 14h3M7 18h3" /></svg>;
  if (name === 'chat') return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 5h16v11H9l-5 4V5Z" /><path d="M8 10h.01M12 10h.01M16 10h.01" /></svg>;
  return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 3h9l3 3v15H6z" /><path d="M15 3v4h4M9 11h6M9 15h6" /></svg>;
};

export default function HomeWorkspace({
  primaryCase,
  hasBaziCase,
  onOpenCase,
  onCreateBazi,
  onCreateZiwei,
  onOpenDaily,
  onOpenDivination,
  onOpenAlmanac,
  onOpenChat,
  onOpenRecords,
}: Props) {
  const [divinationOpen, setDivinationOpen] = useState(false);
  const tasks = [
    { key: 'chart', title: '建立命盘', description: '输入出生信息，生成八字或紫微命盘', action: onCreateBazi },
    { key: 'sun', title: '看看今天', description: hasBaziCase ? '查看今天的运势与重要提示' : '建立八字命盘后查看个性化日运', action: onOpenDaily },
    { key: 'divination', title: '我要占测', description: '选择合适的方法，针对具体事情起盘判断', action: () => setDivinationOpen((current) => !current) },
    { key: 'calendar', title: '挑选吉日', description: '选择良辰吉日，查看适合事项与时辰', action: onOpenAlmanac },
    { key: 'chat', title: '问智解', description: '引用命例或历史记录，直接咨询你的问题', action: onOpenChat },
    { key: 'record', title: '分析记录', description: '查看真正发生过解读和问答的历史', action: onOpenRecords },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-4">
      <section className="glass-panel overflow-hidden rounded-[30px] border border-white/70 px-5 py-7 md:px-9 md:py-9">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-700/70">元分 · 智解</div>
            <h2 className="display-title text-3xl font-bold leading-tight text-stone-900 md:text-[2.8rem]">今天想从哪里开始？</h2>
          </div>
        </div>

        {primaryCase ? (
          <button type="button" onClick={onOpenCase} className="group mt-7 flex w-full items-center gap-4 rounded-[20px] border border-white/75 bg-white/54 px-4 py-4 text-left shadow-[0_8px_24px_rgba(28,25,23,0.04)] hover:bg-white/78 md:px-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-amber-50 text-amber-700"><TaskIcon name="record" /></span>
            <span className="min-w-0 flex-1">
              <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">继续上次</span>
              <span className="block truncate text-lg font-bold text-stone-900">{primaryCase.title}</span>
              <span className="mt-1 block text-sm text-stone-500">{primaryCase.summary}{primaryCase.detail ? ` · ${primaryCase.detail}` : ''}</span>
            </span>
            <span className="text-xl text-stone-400 group-hover:translate-x-0.5 group-hover:text-amber-700">›</span>
          </button>
        ) : (
          <div className="mt-7 rounded-[20px] border border-white/70 bg-white/42 px-5 py-4">
            <div className="text-sm font-bold text-stone-700">三步开始使用</div>
            <div className="mt-3 grid gap-2 text-sm text-stone-500 sm:grid-cols-3">
              {['输入出生信息', '生成并保存命盘', '按需请求解读'].map((label, index) => (
                <span key={label} className="flex items-center gap-2"><b className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-[10px] font-bold text-amber-100">{index + 1}</b>{label}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3">
          {tasks.map((task) => (
            <button key={task.key} type="button" onClick={task.action} aria-expanded={task.key === 'divination' ? divinationOpen : undefined} className={`group relative flex min-h-36 flex-col items-start gap-4 rounded-[20px] border p-4 text-left md:min-h-44 md:p-5 ${task.key === 'divination' && divinationOpen ? 'border-amber-200/80 bg-amber-50/70 shadow-[0_10px_30px_rgba(180,119,31,0.08)]' : 'border-white/75 bg-white/46 hover:border-amber-200/70 hover:bg-white/72'}`}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-amber-100/80 bg-amber-50/80 text-amber-700"><TaskIcon name={task.key} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-stone-900 md:text-lg">{task.title}</span>
                <span className="mt-1 hidden text-sm leading-6 text-stone-500 sm:block">{task.description}</span>
              </span>
              <span className={`absolute bottom-4 right-4 text-xl text-stone-400 group-hover:text-amber-700 ${task.key === 'divination' && divinationOpen ? 'rotate-90' : 'group-hover:translate-x-0.5'}`}>›</span>
            </button>
          ))}
        </div>

        {divinationOpen && (
          <div className="materialize-in mt-4 rounded-[22px] border border-white/75 bg-white/58 p-4 md:p-5" style={{ '--material-origin': '50% 0%' } as React.CSSProperties}>
            <div className="mb-3">
              <div className="text-sm font-bold text-stone-800">选择占测方式</div>
              <div className="mt-1 text-xs text-stone-500">按问题的性质选择，不确定时可先用梅花易数快速判断。</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['qimen', '奇门遁甲', '适合具体决策、方向与时机'],
                ['liuyao', '六爻纳甲', '适合一事一问、判断成败'],
                ['meihua', '梅花易数', '适合快速起卦与即时问事'],
                ['daliuren', '大六壬', '适合复杂人事与发展判断'],
                ['taiyi', '太乙神数', '适合趋势与大局分析'],
                ['xiaoliuren', '小六壬', '适合日常事情快速判断'],
              ].map(([type, label, description]) => (
                <button key={type} type="button" onClick={() => onOpenDivination(type as Parameters<Props['onOpenDivination']>[0])} className="group rounded-[16px] border border-stone-200/60 bg-white/64 px-4 py-3 text-left hover:border-amber-200 hover:bg-white">
                  <span className="block text-sm font-bold text-stone-800">{label}</span>
                  <span className="mt-1 flex items-end gap-2 text-xs leading-5 text-stone-500"><span className="flex-1">{description}</span><span className="text-stone-300 group-hover:translate-x-0.5 group-hover:text-amber-700">›</span></span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!primaryCase && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={onCreateBazi} className="glass-panel-dark rounded-[14px] px-5 py-2.5 text-sm font-bold text-amber-100">建立八字命盘</button>
            <button type="button" onClick={onCreateZiwei} className="rounded-[14px] border border-stone-200/80 bg-white/64 px-5 py-2.5 text-sm font-bold text-stone-700 hover:bg-white">建立紫微命盘</button>
          </div>
        )}
      </section>
    </div>
  );
}
