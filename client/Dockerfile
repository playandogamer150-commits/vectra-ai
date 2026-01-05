# Estágio 1: Build do React com Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependências da raiz
COPY package*.json ./
RUN npm install

# Copia todo o código fonte (Cliente e Servidor, pois é um repo unificado)
COPY . .

# Executa o build (gera os arquivos estáticos em dist/public conforme vite.config.ts)
RUN npm run build

# Estágio 2: Servidor web leve para servir os arquivos estáticos
FROM nginx:stable-alpine

# Copia os arquivos estáticos gerados pelo Vite do estágio anterior
COPY --from=builder /app/dist/public /usr/share/nginx/html

# Copia a configuração customizada do Nginx
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# Expõe a porta 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
