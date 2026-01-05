# Estágio 1: Build da Aplicação TypeScript
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copia os arquivos de dependências
COPY package*.json ./
RUN npm install

# Copia o resto do código-fonte
COPY . .

# Compila o TypeScript para JavaScript (gera dist/index.cjs)
RUN npm run build

# Estágio 2: Imagem de Produção Otimizada
FROM node:20-alpine

WORKDIR /usr/src/app

# Copia apenas as dependências de produção
COPY --from=builder /usr/src/app/package*.json ./
RUN npm install --omit=dev

# Copia os artefatos compilados
COPY --from=builder /usr/src/app/dist ./dist

# Expõe a porta que a API usa
EXPOSE 5000

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=5000

# Comando para iniciar a aplicação
CMD [ "node", "dist/index.cjs" ]
