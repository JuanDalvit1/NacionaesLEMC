# Deploy no Coolify (Docker)

O sistema é servido em um único container: a API Express escuta na porta **3000** e serve também o frontend (SPA) a partir da pasta `dist`.

---

## Se deu "could not read Username for 'https://github.com'"

O Coolify está clonando via **HTTPS** e não tem credenciais. Dá para resolver de dois jeitos:

### 1) Deixar o repositório público (mais simples)

- No GitHub: **NacionaesLEMC** → **Settings** → **General** → **Danger Zone** → **Change repository visibility** → **Make public**.
- No Coolify não precisa mudar nada na URL; pode continuar `https://github.com/JuanDalvit1/NacionaesLEMC`. Só clicar em **Deploy** de novo.

### 2) Manter privado e mudar a URL no Coolify

**Onde mudar no Coolify:**

1. Abra o **recurso/aplicação** (NacionaesLEMC) no Coolify.
2. Vá na aba **Source** (ou **General** / **Repository**).
3. No campo **Repository URL** (ou **Git Repository**), troque:
   - **De:** `https://github.com/JuanDalvit1/NacionaesLEMC`  
   - **Para:**
     - **SSH:** `git@github.com:JuanDalvit1/NacionaesLEMC.git`  
       (antes configure a Deploy Key no GitHub; veja “Opção A” abaixo.)
     - **OU HTTPS com token:** `https://SEU_TOKEN_AQUI@github.com/JuanDalvit1/NacionaesLEMC`  
       (troque `SEU_TOKEN_AQUI` pelo seu Personal Access Token do GitHub, ex.: `ghp_xxxx...`; veja “Opção B” abaixo.)
4. Salve e clique em **Deploy** de novo.

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

### Supabase em rede privada (ex.: 192.168.x.x)

Se o frontend for acessado por um endereço público (ex.: `http://177.11.146.114:8120`) e o Supabase estiver em rede privada (ex.: `http://192.168.1.220:54321`), o navegador bloqueia as requisições diretas (política *Private Network Access*). O app contorna isso **automaticamente**: no navegador, quando detecta que a URL do Supabase é privada, usa o proxy `/api/supabase` do próprio servidor (mesma origem). O backend (Express) faz a requisição ao Supabase na rede interna. Não é necessário alterar variáveis de ambiente; basta que `SUPABASE_URL` no servidor aponte para o Supabase real.

## Build local (testar a imagem)

```bash
docker build -t nacionaeslemc .
docker run -p 8120:3000 --env-file .env nacionaeslemc
```

Acesse `http://localhost:8120`.

## Health check

A API expõe `GET /api/health`, que retorna `{ "status": "ok" }`. Pode ser usada no Coolify como health check path: `/api/health`.

---

## POST /api/sync retorna 405 (Method Not Allowed)

Se o frontend recebe **405** ao chamar `POST /api/sync`, em geral o **proxy reverso** (Coolify/Nginx/Traefik) à frente do container está bloqueando ou não encaminhando o método POST.

**O que fazer:**

1. No Coolify (ou no proxy que aponta para o app), garanta que **todas** as requisições para o serviço (incluindo POST, PUT, PATCH, OPTIONS) sejam encaminhadas para o container na porta 3000 — não apenas GET.
2. Se houver regra do tipo “servir arquivos estáticos primeiro” ou “só encaminhar GET”, ajuste para que caminhos que começam com **`/api/`** sejam sempre repassados ao backend (Node), com o mesmo método e corpo da requisição.
3. Depois de alterar a configuração do proxy, teste de novo o sync a partir da interface.

### Coolify com proxy Caddy (405 persiste após remover try_files)

Se o Coolify usa Caddy e os logs mostram `"Allow":["GET, HEAD"]`, a label **`caddy_0.try_files={path} /index.html /index.php`** faz o Caddy aceitar só GET/HEAD. O Coolify pode **recolocar** essas labels a cada deploy. Duas saídas:

**Opção A – Usar Traefik no servidor (recomendado)**  
1. No Coolify, vá em **Server** → **Proxy** (ou configuração do proxy do servidor).  
2. Ative **“Generate labels only for Traefik”** (ou use Traefik como proxy em vez de Caddy).  
3. Faça **Redeploy** do recurso. Com Traefik, as rotas costumam encaminhar todos os métodos (GET, POST, etc.) para o container e o 405 tende a sumir.

**Opção B – Manter Caddy e priorizar /api**  
Adicione **novas** Container Labels no recurso (não apague as que o Coolify gera) para que o Caddy trate `/api` antes do `try_files`:

- `caddy_0.handle_path.1=/api*`  
- `caddy_0.handle_path.1_reverse_proxy={{upstreams 3000}}`

Salve, faça Redeploy e teste. Se o Coolify usar outra numeração (ex.: `handle_path.0` já existente), ajuste para um número que não conflite com as labels já listadas (ex.: `.2` em vez de `.1`). O objetivo é existir um bloco que faça `handle_path /api*` com `reverse_proxy` para a porta 3000.

Não marque **“Is it a static site?”** para este app, pois ele tem API (POST `/api/sync`, `/api/dashboard-stats`).

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
