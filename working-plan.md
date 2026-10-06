# Software Engineering Case Study

## EdQuest AI — AI-Powered Collaborative Learning and Classroom Intelligence Platform

**An AI-powered, multi-tenant learning management and educational intelligence platform**

| Attribute        | Description                                                         |
| ---------------- | ------------------------------------------------------------------- |
| Project category | EdTech / SaaS                                                       |
| Primary users    | Teachers and students                                               |
| Architecture     | Modular monolith with layered design                                |
| Backend          | Node.js, Express.js                                                 |
| Frontend         | React, TypeScript, Vite, Tailwind CSS                               |
| Database         | PostgreSQL, pgvector                                                |
| Caching and jobs | Redis, BullMQ                                                       |
| AI               | Google Gemini API, embedding model                                  |
| Deployment       | Docker, Render, GitHub Actions                                      |
| Core domains     | Classroom management, AI assessments, RAG, analytics, collaboration |

### 1. Executive Summary

EdQuest AI is a multi-tenant educational platform designed to improve the way teachers manage classrooms, create assessments, distribute educational resources, and evaluate student learning.

### 2. Problem Statement

There is a need for a unified learning platform that connects teaching material, AI-assisted learning, classroom assessments, collaboration, and performance analytics into a continuous educational workflow.

### 3. Proposed Solution

EdQuest AI will provide a unified environment for teachers and students, with AI capabilities grounded in approved educational resources.

### 4. User Roles and Functional Requirements

- Teacher: Classroom management, AI assessment creation, scheduling, analytics.
- Student: Learning management, self-practice, RAG-based document assistant, AI flashcards.
- Platform Administrator.

### 5. Learning Intelligence Engine

Student-wise, Class-wise, Quiz-wise analytics, and Teaching effectiveness insights.

### 6. AI and RAG Architecture

Curriculum-grounded quiz generation and RAG-based Chat with PDF.

### 7. Proposed Technology Stack (Updated)

**Frontend:** React + TypeScript + Vite + Tailwind CSS, React Router, TanStack Query, Axios, React Hook Form, Zod, Recharts.
**Backend:** Node.js, Express.js, REST APIs, MVC.
**Database:** PostgreSQL, pgvector.
**AI Layer:** Gemini 2.5 Flash, Embeddings, RAG.
**Async & Caching:** Redis, BullMQ.
**Security:** Passport.js, OAuth 2.0, bcrypt, Sessions, RBAC.

### 11. Detailed Development Roadmap & Tasks

**Phase 0: Requirements engineering, use cases, UML, architecture**

- Define the problem statement, user roles (Teacher, Student, Admin), and functional requirements.
- Design the initial Database ER Models (Identity, Classroom, Assessment, Analytics).
- Plan the Layered Architecture and Modular Monolith structure.

**Phase 1: Project setup, configuration, Docker, PostgreSQL**

- Initialize Node.js + Express backend and React + TypeScript + Vite frontend.
- Setup PostgreSQL database and database access layers (ORM/SQL).
- Configure ESLint, Prettier, and basic security headers (Helmet).
- Setup Docker and Docker Compose for local multi-container environments.

**Phase 2: Multi-tenant authentication and authorization**

- Implement Passport.js (OAuth 2.0 / Local login) and bcrypt password hashing.
- Set up secure sessions and tenant-level authorization logic (RBAC).
- Build frontend login, registration, and session management UI.

**Phase 3: Organization, class, enrollment, and membership management**

- Build APIs for Organization and Class management.
- Implement student enrollment, class invitations, and membership tracking.
- Build the Teacher dashboard to manage rosters and the Student view to browse classes.

**Phase 4: Learning resource and document management**

- Integrate S3-compatible object storage for file uploads.
- Build APIs for teachers to upload and organize PDFs/notes by subject and topic.
- Build frontend UI for students to access and read shared materials.

**Phase 5: AI quiz generation and source validation**

- Integrate Google Gemini API and PDF parsing libraries (OCR if needed).
- Build backend service to generate curriculum-grounded MCQs from text.
- Enforce strict structured AI outputs using Zod schema validation.
- Build Teacher UI to review, edit, approve, and publish AI-generated questions.

**Phase 6: Scheduled assessments, submissions, and evaluation**

- Build APIs for scheduling assessments (start time, deadline, duration limits).
- Build the Student test-taking interface with a countdown timer.
- Implement secure submission endpoints, auto-grading, and storing item-level responses.

**Phase 7: Student, class, and quiz analytics foundation**

- Create database queries for basic aggregated metrics (average scores, pass rates, participation).
- Build baseline Recharts dashboards for teachers to view assessment results.
- Provide students with their personal attempt history and basic score feedback.

**Phase 8: RAG ingestion, retrieval, chat, and citations**

- Setup `pgvector` in PostgreSQL for vector storage.
- Build the background ingestion pipeline: document chunking and embedding generation.
- Implement the RAG pipeline to retrieve relevant context for natural language questions.
- Build the PDF Chat UI allowing students to ask questions and view source page citations.

**Phase 9: Student self-practice and AI flashcards**

- Build APIs for students to generate personalized AI flashcard decks from class materials.
- Implement a spaced-repetition scheduling algorithm for reviewing cards.
- Build the interactive flashcard UI (flip card, rate mastery: Again, Hard, Familiar, Mastered).

**Phase 10: Enterprise Group Communication & Discussion Platform**

- **Database Schema (PostgreSQL):** Model `channels`, `messages`, `replies` (threaded discussions), and `message_receipts` (read cursors).
- **REST APIs (Node/Express):** Build REST routes for durable actions (create channel, fetch message history, post doubts) separate from WebSockets.
- **Real-Time Delivery (Socket.IO):** Implement WebSocket events (`message:new`, `user:typing`, `message:delivered`, `message:read`, presence).
- **Horizontal Scaling (Redis):** Use Redis Pub/Sub as a Socket.IO adapter to scale across multiple Node instances, and manage ephemeral state (online/typing status).
- **Asynchronous Processing (BullMQ):** Offload heavy tasks triggered by new messages (Email Notifications via Nodemailer, Analytics, Moderation) to background workers.

**Phase 11: Advanced learning analytics and AI teaching insights**

- Implement student-wise and class-wise topic mastery tracking (identifying weak concepts).
- Implement question-wise analytics (Item Difficulty Index / P-value).
- Feed aggregated analytics into Gemini to generate actionable teaching insights (remedial recommendations).
- Build advanced React analytics dashboards visualizing these insights.

**Phase 12: Redis, background jobs, security, testing, optimization**

- Implement Redis caching for high-traffic read routes and BullMQ for async workflows.
- Harden security (Rate limiting, CSRF protection, input validation).
- Write comprehensive Jest unit tests and Supertest integration tests.
- Add database indexing and optimize query performance.

**Phase 13: CI/CD, deployment, monitoring, and documentation**

- Setup GitHub Actions for automated testing and CI/CD pipelines.
- Integrate Pino for structured runtime logging and diagnostics.
- Deploy backend and frontend to Render (or similar hosting).
- Finalize technical documentation and user guides.
