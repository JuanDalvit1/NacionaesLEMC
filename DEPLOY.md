# Deploy no Coolify (Docker)

O sistema é servido em um único container: a API Express escuta na porta **3000** e serve também o frontend (SPA) a partir da pasta `dist`.

## Portas

| Onde | Porta | Descrição |
|------|--------|-----------|
| **Container** | **3000** | Porta interna do app (variável `PORT=3000`) |
| **Externa (Coolify/Proxy)** | **8120** | Porta pública; configurar no Coolify para mapear 8120 → 3000 |

No Coolify, ao criar o serviço:
- **Porta do container**: `3000`
- **Porta pública / Public Port**: `8120` (ou a que desejar no proxy reverso)

## Build

- **Tipo**: Docker
- **Dockerfile**: raiz do repositório (`.`)
- **Context**: raiz do repositório

Não é necessário `docker-compose`; o Coolify usa o Dockerfile diretamente.

## Variáveis de ambiente

Definir no Coolify (Environment Variables) as mesmas do `.env.example`:

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Sim | Chave anônima do Supabase |
| `SUPABASE_URL` | Sim | URL do Supabase (backend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role key |
| `GOOGLE_SHEETS_API_KEY` | Recomendado | Para fontes Google Sheets e sync |
| `PORT` | Não | Padrão no container: `3000` (não é preciso alterar) |

As variáveis `VITE_*` são embutidas no build no momento do `docker build`; se você usar build no Coolify a partir do mesmo repositório, configure-as **antes** do build para que o `vite build` as inclua no frontend. Caso o Coolify só faça deploy de uma imagem já buildada, defina-as no ambiente de execução (o backend as lê; o frontend já vem com os valores do build).

Para **build no Coolify**: adicione as variáveis no passo de Build do serviço para que estejam disponíveis durante `docker build` (ex.: Build Arguments ou Environment no Coolify).

## Build local (testar a imagem)

```bash
docker build -t nacionaeslemc .
docker run -p 8120:3000 --env-file .env nacionaeslemc
```

Acesse `http://localhost:8120`.

## Health check

A API expõe `GET /api/health`, que retorna `{ "status": "ok" }`. Pode ser usada no Coolify como health check path: `/api/health`.
