---
description: Guia Completo de Deploy para Produção (VECTRA AI)
---

# 🚀 VECTRA AI - Guia de Deploy Oficial

Este documento descreve os passos para colocar o VECTRA AI em produção de forma segura e eficiente.

## 1. Pré-Requisitos e Checagem de Saúde

Antes de subir, garanta que:
- [ ] O comando `npm run build` roda localmente sem erros.
- [ ] Todas as variáveis de ambiente sensíveis estão salvas (não apenas no `.env` local).
- [ ] O banco de dados (Supabase) está acessível externamente (Pooler Mode com Session Mode é recomendado para servidor).

## 2. Variáveis de Ambiente Obrigatórias

Configure estas variáveis no painel da sua hospedagem (Coolify, Railway, Render, VPS, etc.).

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `NODE_ENV` | Define o modo de produção | `production` |
| `DATABASE_URL` | Conexão com Supabase (Postgres) | `postgres://user:pass@host:5432/db` |
| `SESSION_SECRET` | Segredo para sessões de usuário | (Gere uma string longa aleatória) |
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe | `sk_live_...` |
| `MODELSLAB_API_KEY` | Chave da API ModelsLab | `...` |
| `REPLIT_DEPLOYMENT` | (Opcional) Define se está no Replit | `0` ou remova |

## 3. Estratégia de Deploy (Recomendado: VPS ou PaaS)

A aplicação é um monolito Node.js (Express) que serve o Frontend (React/Vite).

### Opção A: Railway / Render / DigitalOcean App Platform (Mais Fácil)
1. Conecte seu repositório GitHub.
2. Defina o **Build Command**: `npm run build`
3. Defina o **Start Command**: `npm start`
4. Adicione as Variáveis de Ambiente.
5. Deploy 🚀

### Opção B: VPS (Ubuntu/Debian) com Docker (Mais Profissional)
Crie um arquivo chamado `Dockerfile` na raiz do projeto com este conteúdo:

```dockerfile
# Dockerfile Oficial VECTRA AI
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm ci

# Copia código fonte
COPY . .

# Build da aplicação (Client + Server)
RUN npm run build

# --- Imagem de Produção ---
FROM node:20-alpine AS runner

WORKDIR /app

# Copia apenas o necessário do estágio de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Definições de ambiente
ENV NODE_ENV=production
ENV PORT=5000

# Porta exposta
EXPOSE 5000

# Comando de inicialização
CMD ["npm", "start"]
```

## 4. Pós-Deploy

Após o deploy estar "Verde/Online":
1. **Verifique os Logs**: Procure por "serving on port 5000" e "Stripe schema ready".
2. **Teste a VSL**: Acesse a página `/waitlist` e confirme se o vídeo roda (lembre-se de liberar o domínio de produção no Wistia).
3. **Webhook Stripe**: Se usar pagamentos, configure a URL do Webhook no painel do Stripe apontando para: `https://seu-dominio.com/api/stripe/webhook`.

## 5. Solução de Problemas Comuns

- **Erro "Module not found"**: Certifique-se de que `npm install` (ou `npm ci`) rodou e que as dependências de produção estão instaladas.
- **Erro de Banco de Dados (SSL)**: Se usar Supabase, garanta que a string de conexão termine com `?sslmode=require` se necessário, embora nosso `drizzle.config.ts` já force SSL.
- **VSL Bloqueada**: Adicione o domínio final (ex: `app.vectra.ai`) na lista de permitidos do Wistia.
