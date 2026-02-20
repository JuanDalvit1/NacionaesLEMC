/**
 * Faz parse seguro do body JSON de uma Response.
 * Evita "Unexpected end of JSON input" quando o servidor retorna 405 ou corpo vazio.
 */
export async function parseJsonResponse<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  if (res.status === 405) {
    throw new Error(
      'O proxy (Caddy) está bloqueando POST. No Coolify, remova a label "caddy_0.try_files" nas Container Labels do recurso e faça redeploy. Veja DEPLOY.md.'
    );
  }
  if (!text.trim()) {
    throw new Error(res.ok ? 'Resposta vazia do servidor.' : `Erro ${res.status}: resposta vazia.`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(res.ok ? 'Resposta inválida do servidor.' : `Erro ${res.status}: ${text.slice(0, 100)}`);
  }
}
