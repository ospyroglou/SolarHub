/**
 * Workbook access shared by the ETL (scripts/build-data.ts) and the test
 * suite. Reads the Turkish survey workbook and applies the pilot cut-off.
 *
 * Timestamps are handled as raw Excel serial numbers and converted with pure
 * UTC arithmetic, so the cut-off comparison is deterministic regardless of
 * the machine's timezone.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

export const WORKBOOK_PATH = fileURLToPath(
  new URL('../../data/C_alıs_an_Anketi__Responses_.xlsx', import.meta.url),
);

export const SHEET_EMPLOYEE_ANALYSED = 'Analize dahil edilenler';
export const SHEET_EMPLOYER_ANALYSED = 'İşveren dahil edilenler';
export const SHEET_EMPLOYEE_RAW = 'ham veriler';
export const SHEET_EMPLOYER_RAW = 'İşveren ham veriler';

/**
 * Pilot cut-off (BuildSpec §3.1a): both surveys went live on 2026-03-04.
 * Every record with an earlier timestamp is a pre-launch pilot response.
 * This is a DATE cut-off, not a completeness filter — two excluded employee
 * records are fully complete.
 */
export const CUTOFF_ISO = '2026-03-04';

/** Excel epoch: serial 25569 == 1970-01-01T00:00Z (1900 date system). */
const EXCEL_EPOCH_OFFSET_DAYS = 25569;

/** Excel serial for the cut-off midnight, derived (not hard-coded). */
export const CUTOFF_SERIAL =
  Date.UTC(2026, 2, 4) / 86_400_000 + EXCEL_EPOCH_OFFSET_DAYS;

/** Convert an Excel serial date to an ISO-8601 UTC string. */
export function serialToIso(serial: number): string {
  const ms = Math.round((serial - EXCEL_EPOCH_OFFSET_DAYS) * 86_400_000);
  return new Date(ms).toISOString();
}

/** Convert an Excel serial date to an ISO date (YYYY-MM-DD). */
export function serialToIsoDate(serial: number): string {
  return serialToIso(serial).slice(0, 10);
}

export type Cell = string | number | boolean | null;

export interface SheetRow {
  /** Excel serial timestamp from the Timestamp column. */
  timestamp: number;
  /** ISO-8601 UTC timestamp derived from the serial. */
  timestampIso: string;
  /** Raw cells, 0-indexed by column (cells[0] is the Timestamp serial). */
  cells: Cell[];
}

export interface Sheet {
  name: string;
  /** Column headers (row 1), whitespace-trimmed. */
  headers: string[];
  /** Data rows: rows whose Timestamp column holds a numeric serial. */
  rows: SheetRow[];
}

let workbookCache: XLSX.WorkBook | null = null;

function loadWorkbook(): XLSX.WorkBook {
  if (!workbookCache) {
    workbookCache = XLSX.read(readFileSync(WORKBOOK_PATH), { cellDates: false });
  }
  return workbookCache;
}

/**
 * Read one sheet. Rows are kept only when the Timestamp column contains a
 * numeric Excel serial. This drops trailing null rows (§3.2 step 1) and also
 * drops the leftover pivot fragment sitting below the data in
 * 'İşveren dahil edilenler' (rows 24–33, columns 28–30 — see REPORT.md).
 */
export function readSheet(name: string): Sheet {
  const wb = loadWorkbook();
  const ws = wb.Sheets[name];
  if (!ws) {
    throw new Error(`Sheet not found in workbook: ${name}`);
  }
  const grid = XLSX.utils.sheet_to_json<Cell[]>(ws, {
    header: 1,
    raw: true,
    defval: null,
  });
  const headerRow = grid[0] ?? [];
  const headers = headerRow.map((h) => (typeof h === 'string' ? h.trim() : String(h ?? '')));

  const rows: SheetRow[] = [];
  for (const row of grid.slice(1)) {
    const ts = row[0];
    if (typeof ts !== 'number' || !Number.isFinite(ts)) continue;
    rows.push({ timestamp: ts, timestampIso: serialToIso(ts), cells: row });
  }
  return { name, headers, rows };
}

/** True when a row is at or after the pilot cut-off (analysed set). */
export function isAfterCutoff(row: SheetRow): boolean {
  return row.timestamp >= CUTOFF_SERIAL;
}

/** Apply the pilot cut-off to a sheet's rows (§3.1a). */
export function applyCutoff(rows: SheetRow[]): SheetRow[] {
  return rows.filter(isAfterCutoff);
}
