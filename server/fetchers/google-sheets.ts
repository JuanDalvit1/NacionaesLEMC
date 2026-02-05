import { google } from 'googleapis';

const COL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function colIndexToLetter(index: number): string {
  if (index < 26) return COL_LETTERS[index];
  return COL_LETTERS[Math.floor(index / 26) - 1] + COL_LETTERS[index % 26];
}

function parsePosition(position: string): number {
  const upper = position.trim().toUpperCase();
  if (/^\d+$/.test(upper)) return parseInt(upper, 10) - 1;
  let col = 0;
  for (let i = 0; i < upper.length; i++) {
    col = col * 26 + (upper.charCodeAt(i) - 64);
  }
  return col - 1;
}

export interface SourceConfig {
  id: string;
  url: string;
  sheet_id: string;
  table_name: string;
  start_row: number;
  columns: Array<{ col_name: string; col_type: string; position: string; ordem: number }>;
}

export async function getSheetNameByGid(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  gid: string
): Promise<string> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const targetId = parseInt(gid, 10);
  const sheet = meta.data.sheets?.find((s) => s.properties?.sheetId === targetId);
  if (sheet?.properties?.title) return sheet.properties.title;
  const first = meta.data.sheets?.[0]?.properties?.title;
  if (first) return first;
  return 'Sheet1';
}

/** Retorna os cabeçalhos da planilha para uma linha (ex.: linha do título). position em A, B, C... */
export async function fetchSheetHeaders(
  url: string,
  sheetId: string,
  headerRow: number,
  apiKey: string
): Promise<Array<{ position: string; header: string }>> {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('URL inválida do Google Sheets');
  const spreadsheetId = match[1];
  const gid = sheetId || '0';

  const sheets = google.sheets({ version: 'v4', auth: apiKey });
  const sheetName = await getSheetNameByGid(sheets, spreadsheetId, gid);

  const row = Math.max(1, headerRow);
  const range = `'${sheetName}'!A${row}:ZZ${row}`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const values = (response.data.values as string[][] | undefined)?.[0] ?? [];
  const result: Array<{ position: string; header: string }> = [];

  for (let i = 0; i < values.length; i++) {
    const header = String(values[i] ?? '').trim();
    result.push({
      position: colIndexToLetter(i),
      header: header || `col_${colIndexToLetter(i)}`,
    });
  }

  return result;
}

export async function fetchGoogleSheets(
  config: SourceConfig,
  apiKey: string
): Promise<Record<string, unknown>[]> {
  const match = config.url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('URL inválida do Google Sheets');
  const spreadsheetId = match[1];
  const gid = config.sheet_id;

  const sheets = google.sheets({ version: 'v4', auth: apiKey });
  const sheetName = await getSheetNameByGid(sheets, spreadsheetId, gid);

  const columnIndices = config.columns
    .sort((a, b) => a.ordem - b.ordem)
    .map((c) => parsePosition(c.position));
  const minCol = Math.min(...columnIndices);
  const maxCol = Math.max(...columnIndices);
  const startCol = colIndexToLetter(minCol);
  const endCol = colIndexToLetter(maxCol);
  const range = `'${sheetName}'!${startCol}${config.start_row}:${endCol}1000`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = (response.data.values || []) as string[][];

  const columnConfigs = config.columns.sort((a, b) => a.ordem - b.ordem);
  const result: Record<string, unknown>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, unknown> = {};
    let emptyRow = true;

    for (const col of columnConfigs) {
      // Índice relativo ao range buscado (que começa em minCol)
      const idx = parsePosition(col.position) - minCol;
      const raw = row?.[idx]?.toString().trim() ?? '';

      if (raw) emptyRow = false;

      const converted = convertValue(raw, col.col_type);
      obj[col.col_name] = converted;
    }

    if (!emptyRow) result.push(obj);
  }

  return result;
}

function convertValue(raw: string, colType: string): unknown {
  if (!raw) return null;

  switch (colType) {
    case 'number': {
      const n = parseFloat(raw.replace(',', '.'));
      return isNaN(n) ? null : n;
    }
    case 'date': {
      // Se não conseguir converter para data, retorna NULL (não o valor original como "*******")
      const parsed = parseBrDate(raw);
      return parsed;
    }
    case 'boolean':
      return /^(1|s|sim|yes|true|x)$/i.test(raw);
    default:
      return raw;
  }
}

function parseBrDate(str: string): string | null {
  const ddmmyy = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (ddmmyy) {
    const [, d, m, y] = ddmmyy;
    const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return null;
}
