# EdQuest AI — AI-Powered Multi-Tenant Learning & Educational Intelligence Platform

[![CI/CD Pipeline](https://github.com/Jaggu2m/eduquest/actions/workflows/ci.yml/badge.svg)](https://github.com/Jaggu2m/eduquest/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/Node.js-20.x-339933?logo=nodedotjs)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%20%2B%20pgvector-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?logo=redis)](https://redis.io/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

EdQuest AI is an enterprise-grade, multi-tenant educational intelligence SaaS designed to streamline classroom management, automate curriculum-grounded assessment generation, provide intelligent RAG-driven document chat, power spaced-repetition flashcards, enable real-time collaboration, and provide deep student performance analytics with actionable AI teaching insights.

---

## 🏛️ Architectural Overview

EdQuest AI uses a **modular monolith** with a strict layered design:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React 19 SPA)                  │
│       Vite • TypeScript • Tailwind CSS • TanStack Query     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / WSS
┌──────────────────────────────▼──────────────────────────────┐
│                    Backend (Node.js Express)                │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Security & Middleware Layer                           │  │
│  │ Helmet CSP • CSRF Origin • Pino HTTP • Rate Limiters │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │ Route & Validation Layer (Zod Schemas)                │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │ Controller Layer                                      │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │ Service & Domain Logic Layer                          │  │
│  │ (Auth, Classroom, Assessments, RAG, Flashcards, AI)   │  │
│  └─────────────┬───────────────────────────┬─────────────┘  │
│                │                           │                │
│  ┌─────────────▼─────────────┐ ┌───────────▼─────────────┐  │
│  │ Repositories (Data Access)│ │ Background Workers      │  │
│  │ Prisma ORM + pgvector     │ │ BullMQ (OCR, Ingestion) │  │
│  └─────────────┬─────────────┘ └───────────┬─────────────┘  │
└────────────────┼───────────────────────────┼────────────────┘
                 │                           │
┌────────────────▼─────────────┐ ┌───────────▼─────────────┐
│   PostgreSQL 15 + pgvector   │ │         Redis 7         │
│  Multi-tenant Relational DB  │ │  Cache • BullMQ • PubSub│
└──────────────────────────────┘ └─────────────────────────┘
```

---

## 🚀 Key Modules & Capabilities

### 1. Multi-Tenant Architecture & RBAC
* **Organization Isolation:** Multi-tenancy with strict organizational scoping (`organizationId`, `classId`).
* **Roles:** `PLATFORM_ADMIN`, `ORG_ADMIN`, `TEACHER`, and `STUDENT`.
* **Invite Flow:** Tokenized invite system for teachers and students with expiration & role assignment.

### 2. Classroom & Student Management
* Class creation, sectioning, roster enrollment, student management, and access controls.

### 3. AI-Powered Assessments & Proctored Exam Engine
* **Curriculum-Grounded Assessment Generation:** Uses Groq (`llama-3.3-70b-versatile`) and Google Gemini to generate multiple-choice quizzes directly from course materials.
* **Proctored Exam Mode:**
  * Fullscreen enforcement.
  * Real-time tab-switching tracking with automatic violation logging.
  * Configurable auto-submission upon 3 tab switch violations or timer expiration.
  * Practice mode vs Exam mode workflows.

### 4. RAG-Based Document Assistant ("Chat with PDF")
* PDF parsing, Tesseract OCR fallback for scanned pages, sliding-window chunking.
* Vector embedding generation and semantic similarity search via PostgreSQL `pgvector`.
* Grounded natural language answers with source page citations.

### 5. AI Flashcards & Spaced Repetition (SRS)
* Generates flashcard decks from class documents.
* Interactive 3D flip card UI with SM-2 spaced repetition scheduling (`Again`, `Hard`, `Familiar`, `Mastered`).

### 6. Real-Time Collaboration & Discussion Channels
* Socket.IO live messaging with presence, typing indicators, and read receipts.
* Horizontal scaling ready via Redis Pub/Sub adapter.
* Asynchronous notifications processed via BullMQ queues.

### 7. Learning Analytics & AI Remedial Insights
* Class-wise and student-wise topic mastery tracking.
* Question difficulty analysis (Item Difficulty Index / P-Value).
* Automated AI-generated remedial recommendations for teachers.

### 8. Security Hardening & Observability
* **CSRF Origin Verification** with Bearer API client pass-through.
* **Deep Input Sanitization:** Null byte stripping, whitespace normalization, prototype pollution prevention.
* **Parameter Pollution Protection:** Collapse array collisions on query parameters.
* **Layered Rate Limiting:** Separate throttles for authentication, AI endpoints, and file uploads.
* **Structured Logging:** Centralized Pino logging with PII/secret redaction and request ID tracing.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Hook Form, Zod, Recharts, Lucide Icons, Socket.IO Client |
| **Backend** | Node.js (ESM), Express 5, Prisma ORM 7, Zod, Bcrypt, JWT, Multer, PDF-Parse, Tesseract.js |
| **Database & Vector** | PostgreSQL 15, `pgvector` extension for semantic vector embeddings |
| **Cache & Queues** | Redis 7, BullMQ, `rate-limit-redis`, `ioredis` |
| **AI / LLMs** | Groq SDK (`llama-3.3-70b-versatile`), Google Gemini API |
| **Logging & Security** | Pino, Pino-HTTP, Helmet CSP, CORS |
| **DevOps & CI/CD** | GitHub Actions, Docker, Docker Compose, Nginx, Render Blueprint |

---

## ⚡ Quick Start (Local Development)

### Prerequisites
* **Node.js**: v20 or later
* **Docker & Docker Compose** (for PostgreSQL + Redis)
* **API Keys**: Groq API Key and/or Google Gemini API Key

### 1. Clone & Setup Environment
```bash
git clone https://github.com/Jaggu2m/eduquest.git
cd eduquest
```

Create `backend/.env`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5433/eduquest?schema=public"
REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT=6379
JWT_SECRET="dev_super_secret_jwt_key_minimum_32_characters"
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"

# AI Provider Keys
GROQ_API_KEY="your-groq-api-key"
GEMINI_API_KEY="your-gemini-api-key"
```

### 2. Start PostgreSQL & Redis via Docker
```bash
docker compose up -d postgres redis
```

### 3. Setup Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push # Or run migrations
npm run dev
```
The backend API starts on `http://localhost:3000`. Diagnostic health check available at `http://localhost:3000/api/health`.

### 4. Setup Frontend
```bash
cd ../frontend
npm install
npm run dev
```
The frontend starts on `http://localhost:5173`.

---

## 🐳 Full Containerized Deployment (Docker Compose)

Run the entire platform (PostgreSQL, Redis, Backend, and Frontend) with a single command:

```bash
docker compose up --build -d
```
* **Frontend:** `http://localhost:8080`
* **Backend API:** `http://localhost:3000/api`
* **Health Check:** `http://localhost:3000/api/health`

---

## 🧪 Testing & Quality Assurance

```bash
# Run backend Jest unit and integration tests (35 passing)
cd backend
npm test

# Run backend linter
npm run lint

# Format backend code
npm run format

# Run frontend production build & typecheck
cd ../frontend
npm run build

# Run frontend linter
npm run lint
```

---

## ☁️ Cloud Deployment (Render Blueprint)

EdQuest AI includes a ready-to-deploy **[render.yaml](render.yaml)** Blueprint:
1. Connect your GitHub repository to [Render](https://render.com).
2. Create a new **Blueprint Instance**.
3. Render automatically provisions:
   * **Managed PostgreSQL** with schema setup.
   * **Managed Redis** for caching & background jobs.
   * **Node.js Web Service** for backend with auto-deploy & healthchecks.
   * **Static Site** for frontend SPA with SPA rewrite rules.
4. Supply your `GROQ_API_KEY` and `GEMINI_API_KEY` in the Render Environment Dashboard.

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for exhaustive production deployment instructions.
