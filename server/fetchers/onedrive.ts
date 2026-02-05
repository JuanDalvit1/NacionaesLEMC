import * as XLSX from 'xlsx';

function parsePosition(position: string): number {
  const upper = position.trim().toUpperCase();
  if (/^\d+$/.test(upper)) return parseInt(upper, 10) - 1;
  const COL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let col = 0;
  for (let i = 0; i < upper.length; i++) {
    col = col * 26 + (upper.charCodeAt(i) - 64);
  }
  return col - 1;
}

function convertValue(raw: string, colType: string): unknown {
  if (raw == null || String(raw).trim() === '') return null;
  const str = String(raw).trim();

  switch (colType) {
    case 'number': {
      const n = parseFloat(String(str).replace(',', '.'));
      return isNaN(n) ? null : n;
    }
    case 'date': {
      const parsed = parseBrDate(str);
      return parsed || str;
    }
    case 'boolean':
      return /^(1|s|sim|yes|true|x)$/i.test(str);
    default:
      return str;
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

function getDownloadUrl(url: string): string {
  const editMatch = url.match(/resid=([^&]+).*authkey=([^&]+)/);
  if (editMatch) {
    return `https://onedrive.live.com/download.aspx?resid=${editMatch[1]}&authkey=${editMatch[2]}`;
  }
  if (url.includes('download.aspx')) return url;
  return url;
}

export interface SourceConfig {
  id: string;
  url: string;
  sheet_id: string;
  table_name: string;
  start_row: number;
  columns: Array<{ col_name: string; col_type: string; position: string; ordem: number }>;
}

export async function fetchOneDrive(config: SourceConfig): Promise<Record<string, unknown>[]> {
  const downloadUrl = getDownloadUrl(config.url);

  const res = await fetch(downloadUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NC-Sync/1.0)' },
  });

  if (!res.ok) throw new Error(`OneDrive fetch failed: ${res.status} ${res.statusText}`);

  const buffer = await res.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  let sheet = workbook.Sheets[config.sheet_id];
  if (!sheet) {
    const sheetNames = Object.keys(workbook.Sheets);
    if (sheetNames.length === 0) throw new Error('Nenhuma aba encontrada no Excel');
    sheet = workbook.Sheets[sheetNames[0]];
  }

  const data = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as string[][];

  const startRowIndex = Math.max(0, config.start_row - 1);
  const columnConfigs = config.columns.sort((a, b) => a.ordem - b.ordem);
  const result: Record<string, unknown>[] = [];

  for (let i = startRowIndex; i < data.length; i++) {
    const row = data[i] || [];
    const obj: Record<string, unknown> = {};
    let emptyRow = true;

    for (const col of columnConfigs) {
      const idx = parsePosition(col.position);
      const raw = row[idx] != null ? String(row[idx]).trim() : '';

      if (raw) emptyRow = false;

      obj[col.col_name] = convertValue(raw, col.col_type);
    }

    if (!emptyRow) result.push(obj);
  }

  return result;
}
