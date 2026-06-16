import React, { useMemo, useState } from 'react';
import LocationSelector from './LocationSelector';
import { buildBirthPlaceText, findPlaceCoord } from '../utils/locations';

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
    className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
      active
        ? 'border-blue-500 bg-blue-500 text-white'
        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
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
    <div className="mx-auto max-w-3xl rounded-lg border border-stone-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 text-center">
        <h2 className="text-2xl font-bold text-stone-900">{modelLabel}排盘</h2>
        <p className="mt-1 text-sm text-stone-500">填写出生信息，生成命盘后可继续请求 AI 解读</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-stone-600">姓名（可选）</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="请输入姓名"
            className="w-full rounded-md border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
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
          <div className="rounded-lg border border-stone-200 p-4">
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
                        className="rounded-md border border-stone-200 bg-white p-2 text-sm"
                      >
                        {STEMS.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                      <select
                        value={value.charAt(1)}
                        onChange={(event) => updatePillar(key, value.charAt(0) || '甲', event.target.value)}
                        className="rounded-md border border-stone-200 bg-white p-2 text-sm"
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
                <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="w-full rounded-md border border-stone-200 bg-white p-3 text-sm">
                  {YEAR_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-stone-500">月</label>
                <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="w-full rounded-md border border-stone-200 bg-white p-3 text-sm">
                  {MONTH_OPTIONS.map((item) => <option key={item} value={item}>{calendarType === 'lunar' ? LUNAR_MONTH_NAMES[item] : `${item}月`}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-stone-500">日</label>
                <select value={Math.min(day, dayCount)} onChange={(event) => setDay(Number(event.target.value))} className="w-full rounded-md border border-stone-200 bg-white p-3 text-sm">
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
              className="flex w-full items-center justify-between rounded-md border border-stone-200 px-4 py-3 text-left hover:bg-stone-50"
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

      {timeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
              <div className="text-lg font-bold text-stone-900">出生时辰</div>
              <button type="button" onClick={() => setTimeOpen(false)} className="text-2xl leading-none text-stone-400 hover:text-stone-700">x</button>
            </div>
            <div className="space-y-6 p-6">
              <div className="rounded-md border border-stone-200 p-4">
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
                  className="w-full rounded-md border border-stone-200 p-3 text-center font-mono text-lg"
                />
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-500">快捷选择时辰</label>
                  <span className="text-xs text-stone-400">点击后按时辰排盘，不使用真太阳时</span>
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
                        className={`rounded-md border px-2 py-3 text-center transition ${
                          selected ? 'border-blue-500 bg-blue-500 text-white' : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <div className="font-bold">{item.name}</div>
                        <div className={`text-xs ${selected ? 'text-white/75' : 'text-stone-400'}`}>{item.time}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-stone-100 p-4">
              <button type="button" onClick={() => setTimeOpen(false)} className="rounded-md border border-stone-200 px-4 py-3 font-semibold text-stone-700">取消</button>
              <button type="button" onClick={() => setTimeOpen(false)} className="rounded-md bg-blue-500 px-4 py-3 font-semibold text-white">确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
