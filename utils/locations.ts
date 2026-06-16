import regionsData from '../public/data/china-regions.json';
import coordsData from '../public/data/china-place-coords.json';

export type RegionNode = {
  name: string;
  children?: RegionNode[];
};

export type PlaceCoord = {
  lng: number;
  lat: number;
  type?: string;
  province?: string;
  city?: string;
};

export const CHINA_REGIONS = regionsData as RegionNode[];
export const CHINA_PLACE_COORDS = coordsData as Record<string, PlaceCoord>;

export const normalizePlaceName = (value: string) =>
  value
    .trim()
    .replace(/^(中国|中华人民共和国)/u, '')
    .replace(/(省|市|区|县|自治州|地区|盟)$/u, '');

export const findPlaceCoord = (...parts: Array<string | undefined>) => {
  const candidates = parts
    .filter((item): item is string => Boolean(item?.trim()))
    .flatMap((item) => [item.trim(), normalizePlaceName(item)]);

  for (const key of candidates) {
    const coord = CHINA_PLACE_COORDS[key];
    if (coord) return coord;
  }
  return undefined;
};

export const buildBirthPlaceText = (province?: string, city?: string, district?: string) =>
  [province, city, district].filter(Boolean).join(' ');

export const CITIES_BY_PROVINCE = CHINA_REGIONS.reduce<Record<string, string[]>>((acc, province) => {
  acc[province.name] = (province.children || []).map((city) => city.name);
  return acc;
}, {});
