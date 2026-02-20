import { createClient } from '@supabase/supabase-js';

const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Verifica se o host da URL é de rede privada (localhost, 192.168.x.x, 10.x.x.x, etc.). */
function isPrivateNetworkUrl(urlStr: string): boolean {
  if (!urlStr?.trim()) return false;
  try {
    const host = new URL(urlStr).hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host.startsWith('192.168.') || host.startsWith('10.')) return true;
    if (/^172\.(1[6-9]|2\d|3[01])(\.|$)/.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Em ambiente de navegador: se o Supabase está em rede privada e a página foi servida de outro host (ex.: IP público),
 * o navegador bloqueia a requisição (Private Network Access). Usamos o proxy do mesmo origin (/api/supabase) nesse caso.
 */
const url =
  typeof window !== 'undefined' && configuredUrl && isPrivateNetworkUrl(configuredUrl)
    ? `${window.location.origin}/api/supabase`
    : (configuredUrl || '');

if (!url || !key) {
  console.warn('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar definidos no .env');
}

export const supabase = createClient(url || '', key || '');
