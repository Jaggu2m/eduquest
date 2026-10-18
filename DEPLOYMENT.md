# Production Deployment Guide — EdQuest AI

This guide walks you through deploying the EdQuest AI multi-tenant platform to production environments, including **Render (Blueprint)**, **Docker Containers**, and traditional **Linux VPS / Cloud Instances**.

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:
- [ ] A PostgreSQL database (v15+) with the `pgvector` extension enabled (`CREATE EXTENSION IF NOT EXISTS vector;`).
- [ ] A Redis instance (v7+) with persistence enabled.
- [ ] A strong, random 32+ character string for `JWT_SECRET`.
- [ ] API keys for Groq (`GROQ_API_KEY`) and Google Gemini (`GEMINI_API_KEY`).
- [ ] Target domain names for the frontend and backend (e.g. `app.eduquest.com` and `api.eduquest.com`).

---

## Option 1: Render Blueprint (Recommended for Fastest Launch)

EdQuest AI includes a `render.yaml` blueprint that provisions all services and databases together.

### Step 1: Connect GitHub Repository
1. Navigate to the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Blueprint**.
3. Select your `eduquest` repository.

### Step 2: Review Service Declarations
Render will read `render.yaml` and display the blueprint plan:
* **`eduquest-postgres`**: Managed PostgreSQL Database (native `pgvector` support).
* **`eduquest-redis`**: Managed Redis Instance (caching, Socket.IO, BullMQ).
* **`eduquest-backend`**: Docker Web Service running `backend/Dockerfile` (auto-initializes `pgvector` & Prisma schema).
* **`eduquest-frontend`**: Docker Web Service running `frontend/Dockerfile` (Vite build + Nginx Alpine).

### Step 3: Populate Environment Variables
In the Render dashboard prompt, supply the following keys:
* `GROQ_API_KEY`: Your production Groq API key.
* `GEMINI_API_KEY`: Your production Google Gemini API key.
* `ALLOWED_ORIGINS`: Set to your frontend URL once generated (e.g. `https://eduquest-frontend.onrender.com`).

### Step 4: Automatic Schema & Extension Initialization
You do **not** need to run any manual migration commands! When the backend Docker container starts, it automatically:
1. Executes `node prisma/init-db.js` which verifies and enables the `pgvector` extension.
2. Executes `npx prisma db push` which synchronizes all tables, relations, and indexes.
3. Launches the production Express API server.

### Step 5: Verify Deployment
Navigate to `https://eduquest-backend.onrender.com/api/health`. You should receive:
```json
{
  "status": "healthy",
  "uptimeSeconds": 42,
  "environment": "production",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

---

## Option 2: Production Docker Compose

For deploying on AWS EC2, DigitalOcean Droplet, GCP Compute Engine, or any Linux server with Docker.

### 1. Server Prerequisites
```bash
# Update and install Docker + Docker Compose
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
```

### 2. Clone Repository & Setup Environment
```bash
git clone https://github.com/Jaggu2m/eduquest.git /opt/eduquest
cd /opt/eduquest

cat <<EOF > .env
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 32)
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
ALLOWED_ORIGINS=https://app.yourdomain.com
EOF
```

### 3. Launch Services
```bash
docker compose up -d --build
```

### 4. Apply Schema
```bash
docker compose exec backend npx prisma db push
```

### 5. Setup Reverse Proxy & SSL (Nginx + Certbot)
If running directly on a VPS, place an Nginx reverse proxy in front of ports `8080` (frontend) and `3000` (backend) and obtain SSL certificates via Let's Encrypt:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.yourdomain.com -d api.yourdomain.com
```

---

## 🔒 Security Best Practices in Production

1. **Strict CORS & CSRF:** Set `ALLOWED_ORIGINS` to the exact production frontend domains (comma-separated).
2. **Reverse Proxy Rate Limiting:** The backend enforces IP rate limiting; ensure your reverse proxy (Nginx / Cloudflare) forwards the `X-Forwarded-For` header.
3. **Database Isolation:** Never expose PostgreSQL or Redis ports to the public internet (`0.0.0.0`). Only allow connections from the backend service or VPC.
4. **Log Forwarding:** In production, Pino outputs structured JSON logs. Forward stdout to CloudWatch, Datadog, or Grafana Loki for real-time alerting.

---

## 🩺 Monitoring & Diagnostics

* **Healthcheck URL:** `GET /api/health`
  * Returns HTTP `200` when both PostgreSQL and Redis respond.
  * Returns HTTP `503` when database connectivity is interrupted.
* **Worker Queue Metrics:** Connect Redis Commander or BullMQ Board to monitor `document-processing` and `notification-queue` failure rates.
