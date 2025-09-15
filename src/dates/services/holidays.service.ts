import axios from 'axios';
import { Injectable } from '@nestjs/common';

export type HolidayIso = string; // 'YYYY-MM-DD'
export type HolidaysSet = Set<HolidayIso>;

interface CacheEntry {
  at: number;
  data: HolidaysSet;
}

/**
 * Descarga https://content.capta.co/Recruitment/WorkingDays.json
 * y lo cachea en memoria (TTL por defecto: 12h).
 * Acepta varias formas de JSON (array de strings, o array de objetos con "date").
 */
@Injectable()
export class HolidaysService {
  private static readonly URL = 'https://content.capta.co/Recruitment/WorkingDays.json';
  private static readonly TTL_MS = 12 * 60 * 60 * 1000; // 12h
  private cache: CacheEntry | null = null;

  async getHolidays(): Promise<HolidaysSet> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < HolidaysService.TTL_MS) {
      return this.cache.data;
    }

    const resp = await axios.get(HolidaysService.URL, { timeout: 8000 });
    const parsed = this.parsePayload(resp.data);
    this.cache = { at: now, data: parsed };
    return parsed;
  }

  private parsePayload(payload: unknown): HolidaysSet {
    const set = new Set<string>();
    if (Array.isArray(payload)) {
      for (const item of payload) {
        if (typeof item === 'string') {
          const d = item.slice(0, 10);
          if (/^\d{4}-\d{2}-\d{2}$/.test(d)) set.add(d);
        } else if (item && typeof item === 'object') {
          const v =
            (item as any).date ??
            (item as any).Date ??
            (item as any).iso ??
            (item as any).ISO ??
            null;
          if (typeof v === 'string') {
            const d = v.slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) set.add(d);
          }
        }
      }
    } else if (payload && typeof payload === 'object') {
      // objeto con campo "dates" o similar
      const arr: unknown =
        (payload as any).dates ??
        (payload as any).holidays ??
        (payload as any).items ??
        null;
      if (Array.isArray(arr)) {
        for (const x of arr) {
          if (typeof x === 'string') {
            const d = x.slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) set.add(d);
          }
        }
      }
    }
    return set;
  }
}
