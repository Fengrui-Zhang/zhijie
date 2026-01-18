
import React, { useState, useEffect } from 'react';
import { CITIES_BY_PROVINCE } from '../utils/locations';

interface Props {
  province: string;
  setProvince: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
}

const LocationSelector: React.FC<Props> = ({ province, setProvince, city, setCity }) => {
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

  return (
    <div className="bg-stone-50 p-4 rounded-lg border border-stone-100 transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs text-stone-500 font-bold uppercase tracking-wider">真太阳时校准</label>
        <div className="flex items-center gap-2">
           <span className={`text-xs ${isEnabled ? 'text-amber-600 font-bold' : 'text-stone-400'}`}>
             {isEnabled ? '已开启' : '未开启'}
           </span>
           <button 
             onClick={() => handleToggle(!isEnabled)}
             className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${isEnabled ? 'bg-amber-500' : 'bg-stone-300'}`}
           >
             <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
           </button>
        </div>
      </div>

      {isEnabled && (
        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          <div>
            <select 
              value={province} 
              onChange={handleProvinceChange}
              className="w-full border border-stone-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="">选择省份</option>
              {provinces.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <select 
              value={city} 
              onChange={(e) => setCity(e.target.value)}
              disabled={!province}
              className="w-full border border-stone-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none disabled:bg-stone-100 disabled:text-stone-400"
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
          开启后可根据出生地经纬度校准八字排盘时间，提高精准度。
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
