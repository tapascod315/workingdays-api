import { Injectable } from '@nestjs/common';
import { DateTime, Duration } from 'luxon';
import { HolidaysSet } from './holidays.service';

export class BadRequestError extends Error {
  name = 'BadRequestError';
}

export interface ComputeInput {
  startUtcIso: string | null; // si null => ahora en CO
  days: number;               // >=0 (ya validado arriba)
  hours: number;              // >=0 (ya validado arriba)
  holidays: HolidaysSet;
}

type Segment = 'MORNING' | 'LUNCH' | 'AFTERNOON' | 'OFF';

@Injectable()
export class BusinessTimeService {
  private static readonly TZ = 'America/Bogota';
  private static readonly OPEN = { h: 8, m: 0 };
  private static readonly LUNCH_START = { h: 12, m: 0 };
  private static readonly LUNCH_END = { h: 13, m: 0 };
  private static readonly CLOSE = { h: 17, m: 0 };

  compute(input: ComputeInput): string {
    const baseLocal = input.startUtcIso
      ? this.fromUtcToLocalStrict(input.startUtcIso)
      : DateTime.now().setZone(BusinessTimeService.TZ);

    const normalized = this.normalizeBaseline(baseLocal, input.holidays);

    const afterDays = input.days > 0 ? this.addBusinessDays(normalized, input.days, input.holidays) : normalized;
    const afterHours = input.hours > 0 ? this.addBusinessHours(afterDays, input.hours, input.holidays) : afterDays;

    // Devuelve UTC ISO 8601 con Z (sin milisegundos)
    return afterHours.setZone('UTC').toISO({ suppressMilliseconds: true })!;
  }

  private fromUtcToLocalStrict(iso: string): DateTime {
    // Debe terminar en Z
    if (!/Z$/i.test(iso)) {
      throw new BadRequestError('date must be UTC ISO8601 ending with Z');
    }
    const d = DateTime.fromISO(iso, { zone: 'UTC' }).setZone(BusinessTimeService.TZ);
    if (!d.isValid) throw new BadRequestError('Invalid ISO date');
    return d;
  }

  private isHolidayLocal(d: DateTime, holidays: HolidaysSet): boolean {
    return holidays.has(d.toISODate()!);
  }

  private isBusinessDay(d: DateTime, holidays: HolidaysSet): boolean {
    const isWeekend = d.weekday === 6 || d.weekday === 7; // 1=Mon ... 7=Sun
    return !isWeekend && !this.isHolidayLocal(d, holidays);
  }

  private segmentOf(d: DateTime): Segment {
    const mins = d.hour * 60 + d.minute;
    const to = (h: number, m: number) => h * 60 + m;
    if (mins >= to(BusinessTimeService.OPEN.h, BusinessTimeService.OPEN.m) &&
        mins <  to(BusinessTimeService.LUNCH_START.h, BusinessTimeService.LUNCH_START.m)) return 'MORNING';
    if (mins >= to(BusinessTimeService.LUNCH_START.h, BusinessTimeService.LUNCH_START.m) &&
        mins <  to(BusinessTimeService.LUNCH_END.h, BusinessTimeService.LUNCH_END.m)) return 'LUNCH';
    if (mins >= to(BusinessTimeService.LUNCH_END.h, BusinessTimeService.LUNCH_END.m) &&
        mins <  to(BusinessTimeService.CLOSE.h, BusinessTimeService.CLOSE.m)) return 'AFTERNOON';
    return 'OFF';
  }

  /**
   * Normaliza “hacia atrás dentro del horario laboral” y “al día hábil anterior si corresponde”.
   * - Si es festivo/fin de semana => retrocede al día hábil anterior a las 17:00.
   * - Si hora >= 17:00 => 17:00 (mismo día).
   * - Si 12:00–13:00 => 12:00.
   * - Si < 08:00 => 08:00 (mismo día laboral).
   */
  private normalizeBaseline(d: DateTime, holidays: HolidaysSet): DateTime {
    let cur = d;
    if (!this.isBusinessDay(cur, holidays)) {
      // ir al día hábil anterior 17:00
      do {
        cur = cur.minus({ days: 1 }).set({ hour: BusinessTimeService.CLOSE.h, minute: BusinessTimeService.CLOSE.m, second: 0, millisecond: 0 });
      } while (!this.isBusinessDay(cur, holidays));
      return cur;
    }

    // En día hábil, recortar dentro del día
    if (this.segmentOf(cur) === 'OFF') {
      if (cur.hour >= BusinessTimeService.CLOSE.h) {
        return cur.set({ hour: BusinessTimeService.CLOSE.h, minute: BusinessTimeService.CLOSE.m, second: 0, millisecond: 0 });
      }
      if (cur.hour < BusinessTimeService.OPEN.h) {
        return cur.set({ hour: BusinessTimeService.OPEN.h, minute: BusinessTimeService.OPEN.m, second: 0, millisecond: 0 });
      }
    }
    if (this.segmentOf(cur) === 'LUNCH') {
      return cur.set({ hour: BusinessTimeService.LUNCH_START.h, minute: BusinessTimeService.LUNCH_START.m, second: 0, millisecond: 0 });
    }
    return cur.set({ second: 0, millisecond: 0 });
  }

  private nextBusinessDaySameTime(d: DateTime, holidays: HolidaysSet): DateTime {
    let cur = d.plus({ days: 1 });
    while (!this.isBusinessDay(cur, holidays)) cur = cur.plus({ days: 1 });
    return cur;
  }

  private prevBusinessDayClose(d: DateTime, holidays: HolidaysSet): DateTime {
    let cur = d.minus({ days: 1 }).set({ hour: BusinessTimeService.CLOSE.h, minute: BusinessTimeService.CLOSE.m, second: 0, millisecond: 0 });
    while (!this.isBusinessDay(cur, holidays)) {
      cur = cur.minus({ days: 1 }).set({ hour: BusinessTimeService.CLOSE.h, minute: BusinessTimeService.CLOSE.m, second: 0, millisecond: 0 });
    }
    return cur;
  }

  private addBusinessDays(startLocal: DateTime, days: number, holidays: HolidaysSet): DateTime {
    let cur = startLocal;
    for (let i = 0; i < days; i++) {
      cur = this.nextBusinessDaySameTime(cur, holidays);
    }
    // Si caemos en LUNCH, la hora 12:00 es válida como borde (cómputo continúa desde ahí)
    // Si por configuración externa fuese festivo, ya lo saltamos en nextBusinessDaySameTime.
    return cur;
  }

  private addBusinessHours(startLocal: DateTime, hours: number, holidays: HolidaysSet): DateTime {
    let cur = this.normalizeBaseline(startLocal, holidays); // asegurar borde válido
    let remaining = Duration.fromObject({ hours }).as('minutes'); // trabajar en minutos

    while (remaining > 0.0001) {
      const seg = this.segmentOf(cur);
      if (seg === 'MORNING') {
        const untilLunch = DateTime.fromObject(
          { year: cur.year, month: cur.month, day: cur.day, hour: BusinessTimeService.LUNCH_START.h, minute: BusinessTimeService.LUNCH_START.m },
          { zone: BusinessTimeService.TZ },
        );
        const capacity = untilLunch.diff(cur, 'minutes').minutes;
        if (remaining <= capacity) return cur.plus({ minutes: remaining });
        remaining -= capacity;
        // saltar almuerzo
        cur = cur.set({ hour: BusinessTimeService.LUNCH_END.h, minute: BusinessTimeService.LUNCH_END.m });
        continue;
      }

      if (seg === 'AFTERNOON') {
        const untilClose = DateTime.fromObject(
          { year: cur.year, month: cur.month, day: cur.day, hour: BusinessTimeService.CLOSE.h, minute: BusinessTimeService.CLOSE.m },
          { zone: BusinessTimeService.TZ },
        );
        const capacity = untilClose.diff(cur, 'minutes').minutes;
        if (remaining <= capacity) return cur.plus({ minutes: remaining });
        remaining -= capacity;
        // al cerrar, ir a próximo día hábil 08:00
        let next = this.nextBusinessDaySameTime(cur, holidays);
        next = next.set({ hour: BusinessTimeService.OPEN.h, minute: BusinessTimeService.OPEN.m });
        cur = next;
        continue;
      }

      if (seg === 'LUNCH') {
        cur = cur.set({ hour: BusinessTimeService.LUNCH_END.h, minute: BusinessTimeService.LUNCH_END.m });
        continue;
      }

      // OFF => ajustar
      if (cur.hour >= BusinessTimeService.CLOSE.h) {
        let next = this.nextBusinessDaySameTime(cur, holidays);
        next = next.set({ hour: BusinessTimeService.OPEN.h, minute: BusinessTimeService.OPEN.m });
        cur = next;
        continue;
      }
      if (cur.hour < BusinessTimeService.OPEN.h) {
        cur = cur.set({ hour: BusinessTimeService.OPEN.h, minute: BusinessTimeService.OPEN.m });
        continue;
      }

      // Si día no laboral por algún ajuste externo
      if (!this.isBusinessDay(cur, holidays)) {
        cur = this.prevBusinessDayClose(cur, holidays);
      }
    }
    return cur;
  }
}
