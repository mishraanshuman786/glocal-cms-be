
# ==========================================
# Stage 1: Build NestJS application
# ==========================================
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

# Install all dependencies, including Drizzle Kit
RUN npm ci

COPY . .

RUN npm run build


# ==========================================
# Stage 2: Production runtime
# ==========================================
FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/main.js"]


# ==========================================
# Stage 3: Database migration runner
# ==========================================
FROM builder AS migrator

ENV NODE_ENV=production

# Execute pending Drizzle migrations when this
# container is manually started on the VPS.
CMD ["npm", "run", "db:migrate:prod"]
