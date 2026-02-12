# NACIONAES LEMC – Sistema de Gestão v1.0

Sistema de gestão para o motoclube NACIONAES LEMC: coleta de dados de planilhas (Google Sheets / OneDrive), visualização em tabelas, dashboard com indicadores, membros, aniversariantes e controle de quilometragem.

---

## Funcionalidades

### Dashboard
- **KPIs**: Total de membros, Full Patch, PP, 14 (ativos).
- **Composição por Graduação**: gráfico de pizza com legenda minimalista.
- **Tipo Sanguíneo**: gráfico de barras horizontal (tipos ordenados em escadinha por quantidade).
- **Km totais rodados** e **% Full Patch**.
- **Últimas 3 viagens** por data (nome + data).
- **Aniversariantes do mês** e **Próximos aniversários** (links para ficha do membro).
- **Acesso rápido** aos membros (grid com link para detalhe).

### Tabelas
- Seleção de fonte (planilhas sincronizadas).
- DataGrid com ordenação, paginação e opção de virtual scroll para muitas linhas.
- Indicadores no header quando a tabela é de membros (totais, PP, 14, Full).

### Membros
- Lista por tipo (Full, PP, 14) com links para a ficha de cada membro.
- Ordem: Full → PP → 14.

### Ficha do Membro (detalhe)
- **Dados pessoais**: nascimento, TS/FRH, CPF, CNH, graduação, função, situação, moto, placa, contatos.
- **Quilometragem**:
  - **Lançamentos (soma)**: expressão da planilha de KMs (ex.: 232 + 530 + …) em área rolável.
  - **Total (planilha KMs)**: soma dos km da planilha por nome do membro.
  - **Soma das viagens (nc_viagens)**: quando houver registros na tabela de viagens.
- **Viagens (planilha KMs)**: lista de viagens do membro vindas da planilha de KMs (data, descrição, km).
- **Viagens (nc_viagens)**: quando existir, lista com data, trajeto e km.

### Aniversariantes
- Página dedicada com aniversariantes do mês e próximos até o fim do ano.

### Admin
- **Fontes**: cadastro de fontes (Google Sheets, OneDrive, etc.) e colunas.
- **Sync**: disparo de sincronização das planilhas para o Supabase.

---

## Tecnologias

- **Frontend**: React 19, Vite 7, MUI 7, React Router 7, TanStack Query, Recharts, date-fns.
- **Backend (sync)**: Express 5, Supabase (JS client), Google Sheets API, XLSX (OneDrive/Excel).
- **Banco**: Supabase (PostgreSQL).

---

## Configuração

1. Clone o repositório e instale as dependências:

```bash
git clone https://github.com/<seu-usuario>/NacionaesLEMC.git
cd NacionaesLEMC
npm install
```

2. Copie o arquivo de exemplo de variáveis de ambiente:

```bash
cp .env.example .env
```

3. Preencha o `.env`:

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase (frontend) |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima do Supabase (frontend) |
| `SUPABASE_URL` | URL do projeto (backend/sync) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (escrita no Supabase) |
| `GOOGLE_SHEETS_API_KEY` | API Key do Google Cloud (planilhas Google) |
| `PORT` | Porta do servidor (opcional: 3001 em dev; em produção/Docker use 3000) |

---

## Execução

```bash
# Desenvolvimento (frontend + servidor de sync)
npm run dev

# Apenas frontend
npm run dev:client

# Apenas servidor de sync (outro terminal)
npm run server

# Build de produção
npm run build

# Preview do build
npm run preview

# Sync manual (script)
npm run sync
```

O Vite faz proxy de `/api` para o servidor em desenvolvimento; o servidor de sync precisa estar rodando para o admin sincronizar fontes. Em produção (Docker/Coolify), a API e o frontend são servidos pelo mesmo processo na porta 3000 (ver [DEPLOY.md](./DEPLOY.md)).

---

## Estrutura do projeto

```
├── server/                 # API de sincronização
│   ├── index.ts            # Express + rotas /api
│   ├── sync-engine.ts      # Motor de sync e upsert no Supabase
│   ├── fetchers/
│   │   ├── google-sheets.ts
│   │   └── onedrive.ts
│   └── ...
├── src/
│   ├── App.tsx             # Rotas e providers
│   ├── components/         # Layout, DataGrid, DataGridVirtual, AppErrorBoundary
│   ├── contexts/           # ThemeContext, TabelasHeaderContext
│   ├── lib/                # supabase, membros-data, membro-stats, kms-data
│   ├── pages/              # Dashboard, Tabelas, Membros, MembroDetalhe, Aniversariantes, Admin
│   └── theme.ts
├── scripts/
│   └── run-sync.mjs        # Script de sync manual
├── .env.example
├── package.json
└── README.md
```

---

## Tabelas Supabase (prefixo NC_)

| Tabela | Descrição |
|--------|-----------|
| `nc_sources` | Fontes de dados (planilhas) |
| `nc_source_columns` | Colunas por fonte |
| `nc_membros` | Cadastro de membros |
| `nc_viagens` | Viagens (uma tabela de viagens) |
| `nc_kms_totais` | Totais de KM por pessoa (agregado) |
| `nc_data_dynamic` | Dados dinâmicos por fonte (ex.: planilha de KMs, uma linha por registro) |

A **planilha de KMs** é tratada como fonte em `nc_data_dynamic`; o sistema soma os lançamentos por nome do membro e exibe no detalhe do membro e na lista de viagens da planilha.

---

## Rotas

| Rota | Página |
|------|--------|
| `/` | Redireciona para `/dashboard` |
| `/dashboard` | Dashboard |
| `/tabelas` | Visualizador de tabelas |
| `/aniversariantes` | Aniversariantes |
| `/membros` | Lista de membros |
| `/membros/:id` | Ficha do membro |
| `/admin` | Admin (fontes e sync) |

---

## Versão

**v1.0.0** – Projeto finalizado com dashboard, membros, aniversariantes, quilometragem pela planilha de KMs, gráficos e tabelas ajustados.
