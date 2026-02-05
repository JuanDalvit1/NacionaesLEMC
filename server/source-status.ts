import { google } from 'googleapis';

export async function checkGoogleSheetsStatus(
  url: string,
  sheetId: string,
  apiKey: string
): Promise<{ online: boolean; error?: string }> {
  try {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return { online: false, error: 'URL inválida' };
    const sheets = google.sheets({ version: 'v4', auth: apiKey });
    await sheets.spreadsheets.get({ spreadsheetId: match[1] });
    return { online: true };
  } catch (err) {
    return {
      online: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function getOneDriveDownloadUrl(url: string): string {
  const editMatch = url.match(/resid=([^&]+).*authkey=([^&]+)/);
  if (editMatch) {
    return `https://onedrive.live.com/download.aspx?resid=${editMatch[1]}&authkey=${editMatch[2]}`;
  }
  if (url.includes('download.aspx')) return url;
  return url;
}

export async function checkOneDriveStatus(url: string): Promise<{ online: boolean; error?: string }> {
  try {
    const downloadUrl = getOneDriveDownloadUrl(url);
    const res = await fetch(downloadUrl, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NC-Sync/1.0)' },
    });
    return { online: res.ok };
  } catch (err) {
    return {
      online: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
