import React, { useEffect, useMemo, useState } from 'react';
import { CHINA_REGIONS, findPlaceCoord, type RegionNode } from '../utils/locations';

interface Props {
  province: string;
  setProvince: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  district?: string;
  setDistrict?: (val: string) => void;
  enabled?: boolean;
  onEnabledChange?: (value: boolean) => void;
  title?: string;
  helperText?: string;
  disabled?: boolean;
}

const getChildren = (nodes: RegionNode[], name: string) =>
  nodes.find((item) => item.name === name)?.children || [];

const LocationSelector: React.FC<Props> = ({
  province,
  setProvince,
  city,
  setCity,
  district = '',
  setDistrict,
  enabled,
  onEnabledChange,
  title = '真太阳时校准',
  helperText = '按出生地经纬度校准排盘时间。快捷时辰不使用真太阳时。',
  disabled = false,
}) => {
  const [internalEnabled, setInternalEnabled] = useState(Boolean(province || city || district));
  const isControlled = typeof enabled === 'boolean';
  const isEnabled = isControlled ? Boolean(enabled) : internalEnabled;
  const cities = useMemo(() => getChildren(CHINA_REGIONS, province), [province]);
  const districts = useMemo(() => getChildren(cities, city), [cities, city]);
  const coord = isEnabled ? findPlaceCoord(district, city, province) : undefined;

  useEffect(() => {
    if (!isControlled) setInternalEnabled(Boolean(province || city || district));
  }, [city, district, isControlled, province]);

  useEffect(() => {
    if (province && city && !cities.some((item) => item.name === city)) {
      setCity('');
      setDistrict?.('');
    }
  }, [cities, city, province, setCity, setDistrict]);

  useEffect(() => {
    if (district && !districts.some((item) => item.name === district)) {
      setDistrict?.('');
    }
  }, [district, districts, setDistrict]);

  const handleToggle = (next: boolean) => {
    if (disabled) return;
    if (isControlled) onEnabledChange?.(next);
    else setInternalEnabled(next);
    if (!next) {
      setProvince('');
      setCity('');
      setDistrict?.('');
    }
  };

  const indicator = (
    <span
      aria-hidden="true"
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
        isEnabled && !disabled
          ? 'border-blue-300 bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]'
          : 'border-stone-300 bg-white'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full transition-all ${isEnabled && !disabled ? 'bg-white' : 'bg-transparent'}`} />
    </span>
  );

  return (
    <div className={`rounded-lg border border-stone-200 bg-white p-4 transition ${disabled ? 'opacity-60' : ''}`}>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-bold text-stone-800">{title}</div>
          <div className="text-xs text-stone-500">{helperText}</div>
        </div>
        <button
          type="button"
          onClick={() => handleToggle(!isEnabled)}
          className="inline-flex min-w-[92px] items-center justify-end gap-2 self-end whitespace-nowrap rounded-full px-1 py-1 text-sm text-stone-700 transition-colors sm:self-auto"
          aria-pressed={isEnabled}
          disabled={disabled}
        >
          {indicator}
          <span className={isEnabled && !disabled ? 'font-semibold text-blue-600' : 'text-stone-500'}>
            {isEnabled && !disabled ? '已开启' : '已关闭'}
          </span>
        </button>
      </div>

      {isEnabled && !disabled ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-stone-500">省/直辖市</label>
              <select
                value={province}
                onChange={(event) => {
                  setProvince(event.target.value);
                  setCity('');
                  setDistrict?.('');
                }}
                className="w-full rounded-md border border-stone-200 bg-white p-3 text-sm outline-none focus:border-blue-400"
              >
                <option value="">选择省份</option>
                {CHINA_REGIONS.map((item) => (
                  <option key={item.name} value={item.name}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-stone-500">市/区</label>
              <select
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                  setDistrict?.('');
                }}
                disabled={!province}
                className="w-full rounded-md border border-stone-200 bg-white p-3 text-sm outline-none focus:border-blue-400 disabled:opacity-50"
              >
                <option value="">选择城市</option>
                {cities.map((item) => (
                  <option key={item.name} value={item.name}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-stone-500">区/县</label>
              <select
                value={district}
                onChange={(event) => setDistrict?.(event.target.value)}
                disabled={!city || districts.length === 0}
                className="w-full rounded-md border border-stone-200 bg-white p-3 text-sm outline-none focus:border-blue-400 disabled:opacity-50"
              >
                <option value="">选择区县</option>
                {districts.map((item) => (
                  <option key={item.name} value={item.name}>{item.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-xs text-stone-400">
            {coord ? `已匹配经纬度：${coord.lng.toFixed(4)}, ${coord.lat.toFixed(4)}` : '未匹配到经纬度时会使用北京时间。'}
          </div>
        </div>
      ) : (
        <div className="text-xs text-stone-400 italic">
          开启后显示省、市、区县选择项，用于按出生地校准排盘时间。
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
