# Deploy no Coolify (Docker)

O sistema é servido em um único container: a API Express escuta na porta **3000** e serve também o frontend (SPA) a partir da pasta `dist`.

---

## Configuração única (depois é só clicar em Deploy)

Para o Coolify conseguir clonar o repositório, configure **uma vez** uma das opções abaixo. As credenciais ficam **só no Coolify e no GitHub** (nunca no código).

### Opção A: SSH + Deploy Key (recomendado)

1. **No Coolify**  
   - Abra o **projeto** ou o **servidor** → **Settings** / **Source** / **SSH Keys**.  
   - Se já existir uma chave SSH listada, copie a **chave pública** (texto que começa com `ssh-rsa` ou `ssh-ed25519`).  
   - Se não existir, use **Generate** ou **Add Key** para criar uma e copie a **chave pública**.

2. **No GitHub**  
   - Repositório **NacionaesLEMC** → **Settings** → **Deploy keys** → **Add deploy key**.  
   - **Title**: ex. `Coolify`.  
   - **Key**: cole a chave **pública** que você copiou do Coolify.  
   - Salve.

3. **No Coolify, na Source do aplicativo**  
   - **URL do repositório** use: `git@github.com:JuanDalvit1/NacionaesLEMC.git`  
   - Salve o recurso.

4. A partir daí é só usar **Deploy** no Coolify.

### Opção B: HTTPS + Personal Access Token (PAT)

1. **No GitHub**  
   - **Settings** (do seu usuário) → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**.  
   - Marque o escopo **repo**.  
   - Gere e **copie o token** (começa com `ghp_`). Guarde em lugar seguro; o GitHub não mostra de novo.

2. **No Coolify, na Source do aplicativo**  
   - **URL do repositório** use:  
     `https://SEU_TOKEN_AQUI@github.com/JuanDalvit1/NacionaesLEMC`  
     (troque `SEU_TOKEN_AQUI` pelo token que você copiou).  
   - Ou, se o Coolify tiver campo **Token** / **Password** para Git, deixe a URL como `https://github.com/JuanDalvit1/NacionaesLEMC` e preencha o token nesse campo.  
   - Salve.

3. Depois disso é só clicar em **Deploy**.

**Nota:** O valor `SHA256:...` que às vezes aparece é a **impressão digital (fingerprint)** da chave SSH, não um token. Para SSH use a chave pública (`ssh-rsa` ou `ssh-ed25519`); para HTTPS use um PAT (`ghp_...`).

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

---

## Erro no deploy: "could not read Username for 'https://github.com'"

Esse erro aparece quando o Coolify tenta clonar o repositório via **HTTPS** e não há credenciais (repositório privado ou pedido de login em ambiente sem teclado).

### Solução 1: Usar **SSH** no Coolify (recomendado para repositório privado)

1. No Coolify, na configuração do **Source** do projeto, troque a URL de:
   - `https://github.com/JuanDalvit1/NacionaesLEMC`
   por:
   - `git@github.com:JuanDalvit1/NacionaesLEMC.git`

2. Configure uma **Deploy Key** ou a **chave SSH do servidor** no Coolify:
   - No Coolify: **Settings** (do servidor ou do projeto) → **Public Keys** / **SSH Keys** e adicione a chave que o Coolify usa para clonar.
   - No GitHub: no repositório **NacionaesLEMC** → **Settings** → **Deploy keys** → **Add deploy key** e cole a chave **pública** do Coolify. Marque "Allow write access" só se precisar que o Coolify faça push.

3. Salve e dispare o deploy de novo.

### Solução 2: Repositório público

Se o repositório for **público**, verifique:

- Em **Source**, a URL está como `https://github.com/JuanDalvit1/NacionaesLEMC` (sem usuário/senha).
- Nenhum "Credential" ou "Token" está configurado de forma que exija login interativo.

Se ainda falhar, use a **Solução 1** (SSH).

### Solução 3: Personal Access Token (HTTPS)

Se quiser continuar com HTTPS e o repositório for privado:

1. No GitHub: **Settings** → **Developer settings** → **Personal access tokens** → crie um token com escopo `repo`.
2. No Coolify, na configuração da **Source**, use a URL no formato:
   - `https://<SEU_TOKEN>@github.com/JuanDalvit1/NacionaesLEMC`
   Ou preencha o campo de **Token/Password** do Coolify com o PAT, se a interface tiver essa opção para repositórios Git.
