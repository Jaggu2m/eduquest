# ==========================================
# EduQuest AI - Backend Dockerfile
# ==========================================
FROM node:20-alpine AS runner

# Install OpenSSL and libc compat for Prisma engine
RUN apk add --no-cache openssl libc6-compat curl

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy dependency manifests first for layer caching
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma7.config.ts ./

# Install production dependencies and generate Prisma client
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eduquest"
RUN npm ci --omit=dev && npx prisma generate

# Copy application source code
COPY src ./src

# Create upload directory for multer files
RUN mkdir -p uploads && chown -R node:node /app

# Run as non-root user for security
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/api/health || exit 1

CMD ["npm", "start"]
