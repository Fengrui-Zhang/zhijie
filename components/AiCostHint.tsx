import React from 'react';

type Props = {
  quota?: number | null;
  cached?: boolean;
  className?: string;
};

export default function AiCostHint({ quota, cached = false, className = '' }: Props) {
  const text = cached
    ? '读取已保存结果 · 不扣点'
    : `成功后扣1点${typeof quota === 'number' ? ` · 剩余${quota}点` : ''}`;
  return <span className={`text-xs text-stone-400 ${className}`}>{text}</span>;
}
