/**
 * Data model for FreeStyle LibreLink / LibreView glucose exports.
 *
 * The CSV export ("glucose data" file) is produced by LibreView in the
 * account's display language — headers may be Arabic, English, etc. The
 * column ORDER is stable across languages, so parsing is positional with
 * header-based sanity checks.
 */

/** LibreView record types found in the glucose export. */
export const RECORD_TYPE = {
  /** Automatic sensor reading stored every ~15 minutes. */
  historicGlucose: 0,
  /** Manual scan / real-time reading (also streamed views in Libre 3/Link). */
  scanGlucose: 1,
  /** Strip (blood) glucose test. */
  stripGlucose: 2,
  /** Ketone reading. */
  ketone: 3,
  /** Insulin entry (rapid- or long-acting, numeric or non-numeric). */
  insulin: 4,
  /** Food / carbohydrate entry. */
  food: 5,
  /** Device event (time change, new sensor, ...). */
  deviceEvent: 6,
} as const;

export interface GlucoseReading {
  /** Timestamp in local device time (minutes precision). */
  time: Date;
  /** Glucose value in mg/dL (converted if the export is mmol/L). */
  mgdl: number;
  /** true when this is an automatic 15-minute historic reading. */
  historic: boolean;
}

export interface InsulinEntry {
  time: Date;
  /** Units, when the entry is numeric. */
  units: number | null;
  kind: "rapid" | "long" | "meal" | "correction" | "userChange" | "unknown";
  nonNumeric: boolean;
}

export interface FoodEntry {
  time: Date;
  grams: number | null;
  servings: number | null;
  nonNumeric: boolean;
}

export interface NoteEntry {
  time: Date;
  text: string;
}

export interface DeviceEventEntry {
  time: Date;
}

export interface StripGlucoseEntry {
  time: Date;
  mgdl: number;
}

export interface LibreExport {
  /** Report title from line 1 (e.g. "بيانات الجلوكوز" / "Glucose Data"). */
  title: string;
  generatedAt: string;
  generatedBy: string;
  /** Device display name(s) seen in the file. */
  devices: string[];
  serials: string[];
  /** Unit detected from headers. Values in this model are always mg/dL. */
  sourceUnit: "mg/dL" | "mmol/L";
  /** All glucose readings (historic + scans) sorted by time. */
  readings: GlucoseReading[];
  insulin: InsulinEntry[];
  food: FoodEntry[];
  notes: NoteEntry[];
  deviceEvents: DeviceEventEntry[];
  strips: StripGlucoseEntry[];
}
