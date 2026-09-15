FROM node:20-alpine

WORKDIR /app

# Prisma (openssl) e compilação do Bcrypt nativo (python3, make, g++)
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    python3 \
    make \
    g++

# Gerenciador de processos
RUN npm install -g pm2

# Copia manifestos primeiro para cache
COPY package*.json ./
COPY turbo.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY packages/database/package*.json ./packages/database/
COPY packages/database-mocks/package*.json ./packages/database-mocks/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY packages/eslint-config/package*.json ./packages/eslint-config/
COPY packages/ui/package*.json ./packages/ui/

# Instala dependências do monorepo
RUN npm install

# Copia todo o código-fonte
COPY . .

# Gera o Prisma Client
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build do Next e do Express
RUN npx turbo run build

EXPOSE 3000 3001

CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]