
import React, { useState, useEffect } from 'react';
import { CITIES_BY_PROVINCE } from '../utils/locations';

interface Props {
  province: string;
  setProvince: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  title?: string;
  helperText?: string;
}

const LocationSelector: React.FC<Props> = ({
  province,
  setProvince,
  city,
  setCity,
  title = '真太阳时校准',
  helperText = '开启后可根据出生地经纬度校准排盘时间，提高精准度。',
}) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const provinces = Object.keys(CITIES_BY_PROVINCE);
  const availableCities = province ? CITIES_BY_PROVINCE[province] || [] : [];

  // Sync internal enable state with parent data presence if initially loaded with data
  useEffect(() => {
    if (province && city) {
      setIsEnabled(true);
    }
  }, []);

  const handleToggle = (checked: boolean) => {
    setIsEnabled(checked);
    if (!checked) {
      setProvince('');
      setCity('');
    }
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProv = e.target.value;
    setProvince(newProv);
    setCity(''); // Reset city when province changes
  };

  const indicator = (
    <span
      aria-hidden="true"
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
        isEnabled
          ? 'border-amber-300/85 bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.14),0_0_18px_rgba(251,191,36,0.36)]'
          : 'border-stone-300/90 bg-white/35'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full transition-all ${isEnabled ? 'bg-white/95' : 'bg-transparent'}`} />
    </span>
  );

  return (
    <div className="glass-panel-soft rounded-[28px] border border-white/60 p-4 md:p-5 transition-all duration-300">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-bold text-stone-700">{title}</div>
          <div className="text-xs text-stone-500">{helperText}</div>
        </div>
        <button
          type="button"
          onClick={() => handleToggle(!isEnabled)}
          className="inline-flex min-w-[108px] items-center justify-end gap-2 self-end whitespace-nowrap rounded-full px-1 py-1 text-sm text-stone-700 transition-colors sm:self-auto"
          aria-pressed={isEnabled}
        >
          {indicator}
          <span className={isEnabled ? 'text-amber-700 font-semibold' : 'text-stone-500'}>{isEnabled ? '已开启' : '已关闭'}</span>
        </button>
      </div>

      {isEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
          <div>
            <label className="block text-xs text-stone-500 mb-1">省份</label>
            <select 
              value={province} 
              onChange={handleProvinceChange}
              className="glass-input glass-select w-full rounded-2xl p-3 text-sm outline-none"
            >
              <option value="">选择省份</option>
              {provinces.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">城市</label>
            <select 
              value={city} 
              onChange={(e) => setCity(e.target.value)}
              disabled={!province}
              className="glass-input glass-select w-full rounded-2xl p-3 text-sm outline-none"
            >
              <option value="">选择城市</option>
              {availableCities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      {!isEnabled && (
        <div className="text-xs text-stone-400 italic">
          开启后会显示省份与城市选择项，用于按出生地校准排盘时间。
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
