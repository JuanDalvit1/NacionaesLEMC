# Stage 1: build do frontend (Vite)
# No Coolify: defina Build Args ou Build Env VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para o build.
FROM node:22-alpine AS builder
WORKDIR /app
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: imagem final – API + SPA estática
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY --from=builder /app/dist ./dist
COPY server ./server

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npx", "tsx", "server/index.ts"]
