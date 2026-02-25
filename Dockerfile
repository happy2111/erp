# ---------- Builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Генерация prisma клиентов (оба)
RUN npx prisma generate --schema=./prisma/main/schema.prisma
RUN npx prisma generate --schema=./prisma/tenant/tenant.prisma

RUN npm run build

# ---------- Production ----------
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

EXPOSE 4000

CMD ["node", "dist/main.js"]