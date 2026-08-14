'use client';

import React from 'react';
import type { GenericTaibuResponse } from '../types';
import { DaliurenBoard, TaiyiBoard, XiaoliurenBoard } from './TraditionalDivinationBoards';

type Props = {
  data: GenericTaibuResponse;
  title?: string;
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.map(formatValue).join('、');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const isSimpleValue = (value: unknown): boolean => (
  value === null
  || value === undefined
  || ['string', 'number', 'boolean'].includes(typeof value)
  || (Array.isArray(value) && value.every((item) => !isPlainObject(item)))
);

const formatCompactValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.map(formatCompactValue).filter(Boolean).join('、') || '—';
  if (!isPlainObject(value)) return String(value);

  const preferred = [
    'name',
    'label',
    'modeLabel',
    'taiyiName',
    'taiyiType',
    'qimenName',
    'qimenLuck',
    'position',
    'positionDesc',
    'wuXing',
  ];
  const parts = preferred
    .map((key) => value[key])
    .filter((item) => item !== undefined && item !== null && item !== '')
    .map(String);

  return parts.length ? Array.from(new Set(parts)).join(' / ') : `结构项 ${Object.keys(value).length} 项`;
};

const formatStarLabel = (key: string): string => {
  const labels: Record<string, string> = {
    primaryStar: '主星',
    yearStar: '年计',
    monthStar: '月计',
    dayStar: '日计',
    hourStar: '时计',
    guestStar: '客星',
    hostStar: '主算',
    dingStar: '定目',
    wenchangStar: '文昌',
    jishiStar: '计神',
  };
  return labels[key] || key.replace(/Star$/, '');
};

const objectEntries = (value: unknown) => (
  isPlainObject(value)
    ? Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined && item !== '')
    : []
);

const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="glass-panel-soft rounded-[26px] border border-white/60 p-4 md:p-5">
    <div className="mb-3 text-sm font-bold text-stone-700">{title}</div>
    {children}
  </div>
);

const EntryList = ({ entries }: { entries: Array<[string, unknown]> }) => (
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {entries.map(([key, value]) => (
      <div key={key} className="glass-panel rounded-[22px] border border-white/60 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">{key}</div>
        <div className="mt-2 break-words text-sm font-semibold leading-6 text-stone-700">{formatValue(value)}</div>
      </div>
    ))}
  </div>
);

const FortuneBlock = ({ fortune }: { fortune: any }) => {
  const categories = fortune?.categories && typeof fortune.categories === 'object'
    ? Object.entries(fortune.categories)
    : [];
  const notes = Array.isArray(fortune?.advice) ? fortune.advice : Array.isArray(fortune?.summary) ? fortune.summary : [];

  if (!categories.length && !notes.length) return null;

  return (
    <div className="glass-panel-soft rounded-[26px] border border-white/60 p-4 md:p-5">
      <div className="mb-3 text-sm font-bold text-stone-700">运势分类</div>
      {categories.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(([label, item]: [string, any]) => (
            <div key={label} className="rounded-2xl border border-white/60 bg-white/55 px-4 py-3">
              <div className="text-xs font-semibold text-stone-500">{label}</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <span className="text-lg font-bold text-stone-800">{item?.level || '—'}</span>
                <span className="text-xs font-semibold text-amber-700">{item?.score ? `${item.score}/5` : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {notes.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm leading-7 text-stone-700">
          {notes.join(' ')}
        </div>
      )}
    </div>
  );
};

const CompactEntryList = ({ entries }: { entries: Array<[string, unknown]> }) => {
  if (!entries.length) return <div className="text-sm text-stone-400">暂无</div>;
  return (
    <div className="space-y-2 text-sm leading-6 text-stone-600">
      {entries.map(([key, value]) => (
        <div key={key} className="flex justify-between gap-3 rounded-xl bg-white/55 px-3 py-2">
          <span className="shrink-0 font-semibold text-stone-500">{key}</span>
          <span className="min-w-0 break-words text-right">{formatCompactValue(value)}</span>
        </div>
      ))}
    </div>
  );
};

const DaliurenBlock = ({ data }: { data: any }) => {
  const sanChuan = data?.sanChuan;
  const siKe = data?.siKe;
  const keTi = data?.keTi;
  if (!sanChuan && !siKe && !keTi) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {siKe && (
        <div className="glass-panel-soft rounded-[26px] border border-white/60 p-4">
          <div className="text-sm font-bold text-stone-700">四课</div>
          <div className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
            {Object.entries(siKe).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3 rounded-xl bg-white/55 px-3 py-2">
                <span className="font-semibold text-stone-500">{key}</span>
                <span className="text-right">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {sanChuan && (
        <div className="glass-panel-soft rounded-[26px] border border-white/60 p-4">
          <div className="text-sm font-bold text-stone-700">三传</div>
          <div className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
            {['chu', 'zhong', 'mo', 'method'].map((key) => (
              <div key={key} className="flex justify-between gap-3 rounded-xl bg-white/55 px-3 py-2">
                <span className="font-semibold text-stone-500">{key}</span>
                <span className="text-right">{formatValue(sanChuan[key])}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {keTi && (
        <div className="glass-panel-soft rounded-[26px] border border-white/60 p-4">
          <div className="text-sm font-bold text-stone-700">课体</div>
          <div className="mt-3 text-sm leading-7 text-stone-600">
            <div>取课：{formatValue(keTi.method)}</div>
            <div>类型：{formatValue(keTi.subTypes)}</div>
            <div>附类：{formatValue(keTi.extraTypes)}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const TaiyiBlock = ({ data }: { data: any }) => {
  if (!data) return null;
  const metaEntries = objectEntries(data.boardMeta);
  const timeEntries = objectEntries(data.datetimeContext);
  const excludedKeys = new Set(['boardMeta', 'datetimeContext', 'coreBoard', 'palaces', 'stars']);
  const coreEntries = objectEntries(data)
    .filter(([key, value]) => !excludedKeys.has(key) && isSimpleValue(value))
    .slice(0, 9);
  const coreBoard = isPlainObject(data.coreBoard) ? data.coreBoard : {};
  const starEntries = Object.entries(coreBoard)
    .filter(([key, value]) => key.endsWith('Star') && isPlainObject(value)) as Array<[string, Record<string, unknown>]>;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="局式信息">
          <CompactEntryList entries={metaEntries.length ? metaEntries : coreEntries.slice(0, 4)} />
        </SectionCard>
        <SectionCard title="时间干支">
          <CompactEntryList entries={timeEntries} />
        </SectionCard>
        <SectionCard title="关键结构">
          <CompactEntryList entries={coreEntries} />
        </SectionCard>
      </div>

      {starEntries.length > 0 && (
        <SectionCard title="星曜要点">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {starEntries.map(([key, star]) => {
              const position = [star.position, star.positionDesc].filter(Boolean).join(' / ');
              const tags = [star.taiyiType, star.qimenLuck, star.wuXing].filter(Boolean).map(String);
              const summary = [star.taiyiName, star.qimenName].filter(Boolean).join(' · ');
              const song = typeof star.song === 'string' ? star.song.replace(/\s+/g, ' ').trim() : '';

              return (
                <div key={key} className="rounded-2xl border border-white/65 bg-white/60 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-stone-400">{formatStarLabel(key)}</div>
                      <div className="mt-1 text-base font-bold text-stone-800">{summary || '—'}</div>
                    </div>
                    {position && (
                      <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        {position}
                      </span>
                    )}
                  </div>
                  {tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span key={tag} className="rounded-lg border border-stone-200 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-stone-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {song && <div className="mt-3 line-clamp-2 text-xs leading-5 text-stone-500">{song}</div>}
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
};

const XiaoliurenBlock = ({ data }: { data: any }) => {
  if (!data) return null;
  const inputEntries = objectEntries(data.input);
  const resultEntries = objectEntries(data.result);
  const extraEntries = objectEntries(data).filter(([key]) => !['input', 'result'].includes(key)).slice(0, 8);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SectionCard title="起课信息">
        <CompactEntryList entries={inputEntries} />
      </SectionCard>
      <SectionCard title="落宫结果">
        <CompactEntryList entries={resultEntries} />
      </SectionCard>
      <SectionCard title="辅助判断">
        <CompactEntryList entries={extraEntries} />
      </SectionCard>
    </div>
  );
};

const AlmanacBlock = ({ data }: { data: any }) => {
  if (!data) return null;
  const almanac = data.almanac || data;
  const dayEntries = objectEntries(data.dayInfo || almanac.dayInfo || {}).slice(0, 8);
  const directionEntries = objectEntries(almanac.directions || data.directions || {});
  const yi = Array.isArray(almanac.yi) ? almanac.yi : Array.isArray(almanac.suitable) ? almanac.suitable : [];
  const ji = Array.isArray(almanac.ji) ? almanac.ji : Array.isArray(almanac.avoid) ? almanac.avoid : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="日课信息">
          <CompactEntryList entries={dayEntries} />
        </SectionCard>
        <SectionCard title="方位">
          <CompactEntryList entries={directionEntries} />
        </SectionCard>
        <SectionCard title="神煞">
          <CompactEntryList
            entries={[
              ['吉神', almanac.jishen],
              ['凶煞', almanac.xiongsha],
              ['冲煞', almanac.chongSha],
              ['胎神', almanac.taiShen],
            ]}
          />
        </SectionCard>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="宜">
          <div className="flex flex-wrap gap-2">
            {(yi.length ? yi : ['暂无']).map((item: string) => (
              <span key={item} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{item}</span>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="忌">
          <div className="flex flex-wrap gap-2">
            {(ji.length ? ji : ['暂无']).map((item: string) => (
              <span key={item} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">{item}</span>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

const GenericTaibuGrid: React.FC<Props> = ({ data, title = '排盘结果' }) => {
  const baseEntries = Object.entries(data.base_info || {}).filter(([, value]) => value !== undefined && value !== '');
  const detail = data.detail_info || {};
  const fortune = (detail as any).fortune;
  const daliuren = (detail as any).daliuren;
  const taiyi = (detail as any).taiyi;
  const xiaoliuren = (detail as any).xiaoliuren;
  const almanac = (detail as any).almanac;
  const specializedBoard = daliuren
    ? <DaliurenBoard data={data} />
    : taiyi
      ? <TaiyiBoard data={data} />
      : xiaoliuren
        ? <XiaoliurenBoard data={data} />
        : null;

  return (
    <div className="space-y-4">
      {specializedBoard || <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-stone-800">{title}</div>
          </div>
        </div>
        <EntryList entries={baseEntries} />
      </div>}

      {!specializedBoard ? <DaliurenBlock data={daliuren} /> : null}
      {!specializedBoard ? <TaiyiBlock data={taiyi} /> : null}
      {!specializedBoard ? <XiaoliurenBlock data={xiaoliuren} /> : null}
      <AlmanacBlock data={almanac} />
      <FortuneBlock fortune={fortune} />
    </div>
  );
};

export default GenericTaibuGrid;
