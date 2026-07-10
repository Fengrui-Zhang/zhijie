import React from 'react';

type CaseRouteStateProps = {
  status: 'loading' | 'not-found';
  onBack: () => void;
};

export default function CaseRouteState({ status, onBack }: CaseRouteStateProps) {
  return (
    <section className="glass-panel-soft rounded-[28px] border border-white/60 px-5 py-14 text-center">
      {status === 'loading' ? (
        <>
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-stone-300 border-t-amber-700" aria-hidden="true" />
          <h2 className="mt-5 text-lg font-bold text-stone-800">正在打开命例</h2>
          <p className="mt-2 text-sm text-stone-500">正在恢复命盘与已保存的分析内容…</p>
        </>
      ) : (
        <>
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 text-xl text-stone-500" aria-hidden="true">?</div>
          <h2 className="mt-5 text-lg font-bold text-stone-800">无法打开此命例</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
            命例不存在、已被删除，或当前账户没有访问权限。访客命例只能在创建它的浏览器中恢复。
          </p>
          <button
            type="button"
            onClick={onBack}
            className="glass-cta mt-6 rounded-2xl px-5 py-2.5 text-sm font-semibold text-amber-200"
          >
            返回命例库
          </button>
        </>
      )}
    </section>
  );
}
