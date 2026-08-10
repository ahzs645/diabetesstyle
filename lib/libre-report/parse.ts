import {
  type GlucoseReading,
  type InsulinEntry,
  type LibreExport,
  RECORD_TYPE,
} from "./types";

/**
 * RFC-4180-ish CSV reader that supports quoted fields containing commas,
 * escaped quotes ("") and embedded newlines (LibreView notes contain both).
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Parse "DD-MM-YYYY HH:mm" (LibreView export) into a local Date. */
export function parseLibreTimestamp(value: string): Date | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2})/.exec(value.trim());
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min] = m;
  const date = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(min),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

const MMOL_TO_MGDL = 18.016;

function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  // Some locales export decimal commas inside quoted fields.
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Column order of the LibreView glucose export (language-independent):
 *  0 Device, 1 Serial Number, 2 Device Timestamp, 3 Record Type,
 *  4 Historic Glucose, 5 Scan Glucose,
 *  6 Non-numeric Rapid-Acting Insulin, 7 Rapid-Acting Insulin (units),
 *  8 Non-numeric Food, 9 Carbohydrates (grams), 10 Carbohydrates (servings),
 * 11 Non-numeric Long-Acting Insulin, 12 Long-Acting Insulin (units),
 * 13 Notes, 14 Strip Glucose, 15 Ketone,
 * 16 Meal Insulin (units), 17 Correction Insulin (units),
 * 18 User Change Insulin (units)
 */
export function parseLibreExport(text: string): LibreExport {
  // Strip a potential BOM.
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = parseCsv(clean);
  if (rows.length < 2) {
    throw new Error("Not a LibreView glucose export: missing header rows");
  }

  const meta = rows[0];
  const header = rows[1];
  if (header.length < 6) {
    throw new Error("Not a LibreView glucose export: unexpected header row");
  }

  // Unit detection: the historic-glucose header carries the unit label.
  const glucoseHeader = header[4] ?? "";
  const isMmol = /mmol|ملمول/i.test(glucoseHeader);
  const factor = isMmol ? MMOL_TO_MGDL : 1;

  const readings: GlucoseReading[] = [];
  const insulin: InsulinEntry[] = [];
  const food: LibreExport["food"] = [];
  const notes: LibreExport["notes"] = [];
  const deviceEvents: LibreExport["deviceEvents"] = [];
  const strips: LibreExport["strips"] = [];
  const devices = new Set<string>();
  const serials = new Set<string>();
  // which device name(s) each serial reported under — a reader and a phone
  // on one account carry different names, so this pairing cannot be recovered
  // from the file-wide device list afterwards
  const devicesBySerial = new Map<string, Set<string>>();

  for (let i = 2; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length < 5) continue;
    const time = parseLibreTimestamp(cols[2] ?? "");
    if (!time) continue;
    const type = toNumber(cols[3]);
    if (type === null) continue;

    const serial = (cols[1] ?? "").trim();
    const device = (cols[0] ?? "").trim();
    if (device) devices.add(device);
    if (serial) serials.add(serial);
    if (serial && device) {
      const named = devicesBySerial.get(serial);
      if (named) named.add(device);
      else devicesBySerial.set(serial, new Set([device]));
    }

    switch (type) {
      case RECORD_TYPE.historicGlucose: {
        const v = toNumber(cols[4]);
        if (v !== null) readings.push({ time, serial, mgdl: v * factor, historic: true });
        break;
      }
      case RECORD_TYPE.scanGlucose: {
        const v = toNumber(cols[5]);
        if (v !== null) readings.push({ time, serial, mgdl: v * factor, historic: false });
        break;
      }
      case RECORD_TYPE.stripGlucose: {
        const v = toNumber(cols[14]);
        if (v !== null) strips.push({ time, serial, mgdl: v * factor });
        break;
      }
      case RECORD_TYPE.insulin: {
        pushInsulin(insulin, time, serial, cols);
        break;
      }
      case RECORD_TYPE.food: {
        food.push({
          time,
          serial,
          grams: toNumber(cols[9]),
          servings: toNumber(cols[10]),
          nonNumeric: toNumber(cols[8]) !== null,
        });
        break;
      }
      case RECORD_TYPE.deviceEvent: {
        deviceEvents.push({ time, serial });
        break;
      }
      default:
        break;
    }

    const noteText = (cols[13] ?? "").trim();
    if (noteText) notes.push({ time, serial, text: noteText });
  }

  readings.sort((a, b) => a.time.getTime() - b.time.getTime());

  return {
    title: (meta[0] ?? "").trim(),
    generatedAt: (meta[2] ?? "").trim(),
    generatedBy: (meta[4] ?? "").trim(),
    devices: [...devices],
    serials: [...serials],
    devicesBySerial: Object.fromEntries(
      [...devicesBySerial].map(([serial, names]) => [serial, [...names]]),
    ),
    sourceUnit: isMmol ? "mmol/L" : "mg/dL",
    readings,
    insulin,
    food,
    notes,
    deviceEvents,
    strips,
  };
}

function pushInsulin(
  out: InsulinEntry[],
  time: Date,
  serial: string,
  cols: string[],
): void {
  const rapidUnits = toNumber(cols[7]);
  const longUnits = toNumber(cols[12]);
  const mealUnits = toNumber(cols[16]);
  const correctionUnits = toNumber(cols[17]);
  const userChangeUnits = toNumber(cols[18]);
  const nonNumericRapid = toNumber(cols[6]) !== null;
  const nonNumericLong = toNumber(cols[11]) !== null;

  if (rapidUnits !== null || nonNumericRapid) {
    out.push({
      time,
      serial,
      units: rapidUnits,
      kind: "rapid",
      nonNumeric: nonNumericRapid && rapidUnits === null,
    });
  }
  if (longUnits !== null || nonNumericLong) {
    out.push({
      time,
      serial,
      units: longUnits,
      kind: "long",
      nonNumeric: nonNumericLong && longUnits === null,
    });
  }
  if (mealUnits !== null) {
    out.push({ time, serial, units: mealUnits, kind: "meal", nonNumeric: false });
  }
  if (correctionUnits !== null) {
    out.push({ time, serial, units: correctionUnits, kind: "correction", nonNumeric: false });
  }
  if (userChangeUnits !== null) {
    out.push({ time, serial, units: userChangeUnits, kind: "userChange", nonNumeric: false });
  }
  if (
    rapidUnits === null &&
    longUnits === null &&
    mealUnits === null &&
    correctionUnits === null &&
    userChangeUnits === null &&
    !nonNumericRapid &&
    !nonNumericLong
  ) {
    out.push({ time, serial, units: null, kind: "unknown", nonNumeric: true });
  }
}
