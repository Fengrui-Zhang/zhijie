import React, { useMemo, useState } from 'react';
import LocationSelector from './LocationSelector';
import { buildBirthPlaceText, findPlaceCoord } from '../utils/locations';
import DialogPortal, { DialogBody } from './DialogPortal';

type CalendarType = 'solar' | 'lunar' | 'pillars';
type TimeInputMode = 'exact' | 'quick';

type Pillars = {
  year: string;
  month: string;
  day: string;
  hour: string;
};

interface Props {
  modelLabel: string;
  name: string;
  setName: (value: string) => void;
  gender: number;
  setGender: (value: number) => void;
  calendarType: CalendarType;
  setCalendarType: (value: CalendarType) => void;
  year: number;
  setYear: (value: number) => void;
  month: number;
  setMonth: (value: number) => void;
  day: number;
  setDay: (value: number) => void;
  hour: number;
  setHour: (value: number) => void;
  minute: number;
  setMinute: (value: number) => void;
  timeInputMode: TimeInputMode;
  setTimeInputMode: (value: TimeInputMode) => void;
  useTrueSolar: boolean;
  setUseTrueSolar: (value: boolean) => void;
  isLeapMonth: boolean;
  setIsLeapMonth: (value: boolean) => void;
  pillars: Pillars;
  setPillars: (value: Pillars) => void;
  province: string;
  setProvince: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  district: string;
  setDistrict: (value: string) => void;
  inDialog?: boolean;
}

const HOUR_OPTIONS = [
  { value: 0, name: '子时', time: '23:00-01:00' },
  { value: 1, name: '丑时', time: '01:00-03:00' },
  { value: 3, name: '寅时', time: '03:00-05:00' },
  { value: 5, name: '卯时', time: '05:00-07:00' },
  { value: 7, name: '辰时', time: '07:00-09:00' },
  { value: 9, name: '巳时', time: '09:00-11:00' },
  { value: 11, name: '午时', time: '11:00-13:00' },
  { value: 13, name: '未时', time: '13:00-15:00' },
  { value: 15, name: '申时', time: '15:00-17:00' },
  { value: 17, name: '酉时', time: '17:00-19:00' },
  { value: 19, name: '戌时', time: '19:00-21:00' },
  { value: 21, name: '亥时', time: '21:00-23:00' },
];

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, index) => CURRENT_YEAR - index);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const LUNAR_MONTH_NAMES: Record<number, string> = {
  1: '正月',
  2: '二月',
  3: '三月',
  4: '四月',
  5: '五月',
  6: '六月',
  7: '七月',
  8: '八月',
  9: '九月',
  10: '十月',
  11: '冬月',
  12: '腊月',
};

const daysInSolarMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
const pad2 = (value: number) => String(value).padStart(2, '0');

const ToggleButton = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
      active
        ? 'glass-panel-dark border-transparent text-amber-200 shadow-[0_16px_34px_rgba(28,25,23,0.18)]'
        : 'glass-chip border-white/60 text-stone-700 hover:bg-white/75 hover:text-stone-900'
    }`}
  >
    {children}
  </button>
);

export default function LifeReadingForm({
  modelLabel,
  name,
  setName,
  gender,
  setGender,
  calendarType,
  setCalendarType,
  year,
  setYear,
  month,
  setMonth,
  day,
  setDay,
  hour,
  setHour,
  minute,
  setMinute,
  timeInputMode,
  setTimeInputMode,
  useTrueSolar,
  setUseTrueSolar,
  isLeapMonth,
  setIsLeapMonth,
  pillars,
  setPillars,
  province,
  setProvince,
  city,
  setCity,
  district,
  setDistrict,
  inDialog = false,
}: Props) {
  const [timeOpen, setTimeOpen] = useState(false);
  const dayCount = calendarType === 'solar' ? daysInSolarMonth(year, month) : 30;
  const days = Array.from({ length: dayCount }, (_, index) => index + 1);
  const placeText = buildBirthPlaceText(province, city, district);
  const coord = findPlaceCoord(district, city, province);
  const trueSolarDisabled = timeInputMode === 'quick';

  const timeSummary = useMemo(() => {
    const option = HOUR_OPTIONS.find((item) => item.value === hour && minute === 0);
    if (timeInputMode === 'quick' && option) return `${option.name} ${option.time}`;
    return `${pad2(hour)}:${pad2(minute)}`;
  }, [hour, minute, timeInputMode]);

  const updatePillar = (key: keyof Pillars, stem: string, branch: string) => {
    setPillars({ ...pillars, [key]: `${stem}${branch}` });
  };

  return (
    <div className={inDialog ? 'mx-auto w-full max-w-4xl' : 'mx-auto max-w-4xl rounded-2xl border border-stone-100 bg-white/70 p-5 shadow-sm backdrop-blur-md md:p-6'}>
      {!inDialog && <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-stone-100/80 pb-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">出生信息</div>
          <h2 className="mt-1 text-2xl font-bold text-stone-900">{modelLabel}排盘</h2>
        </div>
      </div>}

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-stone-600">姓名（可选）</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="请输入姓名"
            className="glass-input w-full rounded-2xl px-4 py-3 text-sm outline-none"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-600">性别</label>
            <div className="grid grid-cols-2 gap-2">
              <ToggleButton active={gender === 0} onClick={() => setGender(0)}>男</ToggleButton>
              <ToggleButton active={gender === 1} onClick={() => setGender(1)}>女</ToggleButton>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-600">历法</label>
            <div className="grid grid-cols-3 gap-2">
              <ToggleButton active={calendarType === 'solar'} onClick={() => setCalendarType('solar')}>公历</ToggleButton>
              <ToggleButton active={calendarType === 'lunar'} onClick={() => setCalendarType('lunar')}>农历</ToggleButton>
              <ToggleButton active={calendarType === 'pillars'} onClick={() => setCalendarType('pillars')}>四柱</ToggleButton>
            </div>
          </div>
        </div>

        {calendarType === 'pillars' ? (
          <div className="glass-panel-soft rounded-[24px] border border-white/60 p-4">
            <div className="mb-3 text-sm font-semibold text-stone-700">输入四柱</div>
            <div className="grid gap-3 md:grid-cols-4">
              {(['year', 'month', 'day', 'hour'] as const).map((key, index) => {
                const value = pillars[key] || '甲子';
                return (
                  <div key={key}>
                    <label className="mb-1 block text-xs text-stone-500">{['年柱', '月柱', '日柱', '时柱'][index]}</label>
                    <div className="grid grid-cols-2 gap-1">
                      <select
                        value={value.charAt(0)}
                        onChange={(event) => updatePillar(key, event.target.value, value.charAt(1) || '子')}
                        className="glass-input glass-select rounded-2xl p-2.5 text-sm outline-none"
                      >
                        {STEMS.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                      <select
                        value={value.charAt(1)}
                        onChange={(event) => updatePillar(key, value.charAt(0) || '甲', event.target.value)}
                        className="glass-input glass-select rounded-2xl p-2.5 text-sm outline-none"
                      >
                        {BRANCHES.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs text-stone-500">年</label>
                <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="glass-input glass-select w-full rounded-2xl p-3 text-sm outline-none">
                  {YEAR_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-stone-500">月</label>
                <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="glass-input glass-select w-full rounded-2xl p-3 text-sm outline-none">
                  {MONTH_OPTIONS.map((item) => <option key={item} value={item}>{calendarType === 'lunar' ? LUNAR_MONTH_NAMES[item] : `${item}月`}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-stone-500">日</label>
                <select value={Math.min(day, dayCount)} onChange={(event) => setDay(Number(event.target.value))} className="glass-input glass-select w-full rounded-2xl p-3 text-sm outline-none">
                  {days.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            </div>

            {calendarType === 'lunar' && (
              <label className="inline-flex items-center gap-2 text-sm text-stone-600">
                <input type="checkbox" checked={isLeapMonth} onChange={(event) => setIsLeapMonth(event.target.checked)} />
                闰月
              </label>
            )}

            <button
              type="button"
              onClick={() => setTimeOpen(true)}
              className="glass-chip flex w-full items-center justify-between rounded-2xl border border-white/60 px-4 py-3 text-left transition hover:bg-white/75"
            >
              <span className="font-semibold text-stone-800">出生时间</span>
              <span className="text-sm text-stone-500">{timeSummary}</span>
            </button>
          </div>
        )}

        {calendarType !== 'pillars' && (
          <LocationSelector
            province={province}
            setProvince={setProvince}
            city={city}
            setCity={setCity}
            district={district}
            setDistrict={setDistrict}
            enabled={useTrueSolar && !trueSolarDisabled}
            onEnabledChange={setUseTrueSolar}
            disabled={trueSolarDisabled}
            helperText={trueSolarDisabled ? '当前为快捷时辰，按时辰排盘，不使用真太阳时。' : '精确时间可选择是否按出生地经纬度校准真太阳时。'}
          />
        )}

        {placeText && coord && calendarType !== 'pillars' && !trueSolarDisabled && (
          <div className="text-xs text-stone-400">出生地点：{placeText}，经纬度 {coord.lng.toFixed(4)}, {coord.lat.toFixed(4)}</div>
        )}
      </div>

      <DialogPortal
        open={timeOpen}
        onClose={() => setTimeOpen(false)}
        labelledBy="birth-time-dialog-title"
        mobileFill
        layerClassName="z-[70]"
        panelClassName="max-w-3xl"
      >
        <div className="glass-panel-soft flex shrink-0 items-center justify-between border-b border-white/50 px-4 py-3 md:px-6 md:py-4">
          <div id="birth-time-dialog-title" className="text-lg font-bold text-stone-900">出生时辰</div>
          <button
            type="button"
            onClick={() => setTimeOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none text-stone-400 transition hover:bg-white/70 hover:text-stone-700"
            aria-label="关闭出生时辰弹窗"
          >
            ×
          </button>
        </div>
        <DialogBody className="space-y-5 p-4 md:space-y-6 md:p-6">
          <div className="glass-panel-soft rounded-[24px] border border-white/60 p-4">
            <label className="mb-2 block text-xs font-bold text-stone-500">精确时间</label>
            <input
              type="time"
              value={`${pad2(hour)}:${pad2(minute)}`}
              onChange={(event) => {
                const [h, m] = event.target.value.split(':').map(Number);
                setHour(h);
                setMinute(m);
                setTimeInputMode('exact');
              }}
              className="glass-input w-full rounded-2xl p-3 text-center font-mono text-lg outline-none"
            />
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="text-xs font-bold text-stone-500">快捷选择时辰</label>
              <span className="text-right text-xs text-stone-400">快捷选择会关闭真太阳时</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {HOUR_OPTIONS.map((item) => {
                const selected = timeInputMode === 'quick' && hour === item.value && minute === 0;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setHour(item.value);
                      setMinute(0);
                      setTimeInputMode('quick');
                      setUseTrueSolar(false);
                    }}
                    className={`rounded-2xl border px-2 py-3 text-center transition ${
                      selected ? 'glass-panel-dark border-transparent text-amber-200' : 'glass-chip border-white/60 text-stone-700 hover:bg-white/75'
                    }`}
                  >
                    <div className="font-bold">{item.name}</div>
                    <div className={`text-xs ${selected ? 'text-white/75' : 'text-stone-400'}`}>{item.time}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </DialogBody>
        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-white/50 bg-white/75 p-3 md:p-4">
          <button type="button" onClick={() => setTimeOpen(false)} className="glass-chip rounded-2xl border border-white/60 px-4 py-3 font-semibold text-stone-700">取消</button>
          <button type="button" onClick={() => setTimeOpen(false)} className="glass-cta rounded-2xl px-4 py-3 font-semibold text-amber-200">确定</button>
        </div>
      </DialogPortal>
    </div>
  );
}
