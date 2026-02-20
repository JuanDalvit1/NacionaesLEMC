const PROXY_HINT =
  ' No Coolify: remova a label "caddy_0.try_files" ou use Traefik; priorize /api no proxy. Veja DEPLOY.md.';

/**
 * Faz parse seguro do body JSON de uma Response.
 * Evita "Unexpected end of JSON input" quando o proxy (Caddy) retorna 405/corpo vazio em produção.
 */
export async function parseJsonResponse<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  if (res.status === 405) {
    throw new Error(
      'O proxy (Caddy) está bloqueando POST.' + PROXY_HINT
    );
  }
  if (!text.trim()) {
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error(`Proxy/servidor retornou ${res.status} (resposta vazia).` + PROXY_HINT);
    }
    if (res.status === 404) {
      throw new Error('Rota /api não encontrada. Verifique se o proxy encaminha /api para o container.' + PROXY_HINT);
    }
    throw new Error(res.ok ? 'Resposta vazia do servidor.' : `Erro ${res.status}: resposta vazia.`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(res.ok ? 'Resposta inválida do servidor.' : `Erro ${res.status}: ${text.slice(0, 100)}`);
  }
}
