
/**
 * Utility to map Chinese characters (Stems, Branches, Trigrams) to Wu Xing Colors.
 * 
 * Metal (Jin): Gold/Amber - text-amber-600
 * Wood (Mu): Green - text-emerald-600
 * Water (Shui): Black/Blue - text-slate-900 (using slate-900 for high contrast black on screen)
 * Fire (Huo): Red - text-red-600
 * Earth (Tu): Brown/Yellow - text-yellow-700
 */

const WUXING_MAP: Record<string, string> = {
  // --- Heavenly Stems (Tiangan) ---
  '甲': 'text-emerald-600', '乙': 'text-emerald-600', // Wood
  '丙': 'text-red-600',     '丁': 'text-red-600',     // Fire
  '戊': 'text-yellow-700',  '己': 'text-yellow-700',  // Earth
  '庚': 'text-amber-600',   '辛': 'text-amber-600',   // Metal
  '壬': 'text-slate-900',   '癸': 'text-slate-900',   // Water

  // --- Earthly Branches (Dizhi) ---
  '寅': 'text-emerald-600', '卯': 'text-emerald-600', // Wood
  '巳': 'text-red-600',     '午': 'text-red-600',     // Fire
  '辰': 'text-yellow-700',  '戌': 'text-yellow-700', '丑': 'text-yellow-700', '未': 'text-yellow-700', // Earth
  '申': 'text-amber-600',   '酉': 'text-amber-600',   // Metal
  '亥': 'text-slate-900',   '子': 'text-slate-900',   // Water

  // --- Trigrams (Bagua) / Palaces ---
  '乾': 'text-amber-600', '兑': 'text-amber-600', // Metal
  '离': 'text-red-600',                          // Fire
  '震': 'text-emerald-600', '巽': 'text-emerald-600', // Wood
  '坎': 'text-slate-900',                        // Water
  '艮': 'text-yellow-700', '坤': 'text-yellow-700', // Earth
  
  // Qimen Palaces usually match Trigrams
  '中': 'text-yellow-700', // Central Earth
};

/**
 * Returns the Tailwind text color class for a given character.
 * Defaults to text-stone-700 if not found.
 */
export const getWuxingColor = (char: string): string => {
  if (!char) return 'text-stone-700';
  // Check strict match first
  if (WUXING_MAP[char]) return WUXING_MAP[char];
  
  // Check if string contains key char (useful for "乾卦" matching "乾")
  for (const key of Object.keys(WUXING_MAP)) {
    if (char.includes(key)) return WUXING_MAP[key];
  }

  return 'text-stone-700';
};
