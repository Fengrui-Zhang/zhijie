import provinceData from '../data/province.json';

type ProvinceCityMap = Record<string, string[]>;

const normalizeProvinceCityMap = (input: unknown): ProvinceCityMap => {
  if (!input || typeof input !== 'object') return {};

  return Object.entries(input as Record<string, unknown>).reduce<ProvinceCityMap>((acc, [province, cities]) => {
    if (!province.trim() || !Array.isArray(cities)) return acc;

    const normalizedCities = cities
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);

    if (normalizedCities.length === 0) return acc;

    acc[province.trim()] = Array.from(new Set(normalizedCities));
    return acc;
  }, {});
};

export const CITIES_BY_PROVINCE = normalizeProvinceCityMap(provinceData);

