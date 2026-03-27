# GrillAI — Monorepo Rules

## Project Structure

This is a **monorepo** containing two fully independent applications:

- `backend/` — Python / FastAPI REST API
- `frontend/` — Node / Vite / React / TypeScript SPA

---

## Strict Rules

### Dependency Isolation
- **Backend dependencies** (Python packages) live exclusively in `backend/requirements.txt` and are installed into `backend/venv`. Never install Python packages globally.
- **Frontend dependencies** (npm packages) live exclusively in `frontend/package.json` and `frontend/node_modules`. Never install npm packages outside of `frontend/`.
- **Dependencies must never mix.** Do not import Python packages from the frontend, and do not import npm packages from the backend.

### Process Isolation
- The backend and frontend are **separate processes** and must always be run independently.
- Backend: run via `uvicorn` from within the `backend/` directory using the local venv.
- Frontend: run via `npm run dev` from within the `frontend/` directory.
- Never start both from a single script or process manager unless explicitly configured for that purpose.

### Backend Rules
- Language: Python 3
- Framework: FastAPI
- Always use the virtual environment at `backend/venv`. Never run `pip install` globally.
- Entry point: `backend/main.py`
- Run command: `backend/venv/Scripts/uvicorn main:app --reload` (Windows) or `backend/venv/bin/uvicorn main:app --reload` (Unix)

### Frontend Rules
- Language: TypeScript
- Framework: React (via Vite)
- Always run `npm` commands from within `frontend/`.
- Entry point: `frontend/src/main.tsx`
- Run command: `npm run dev` (from `frontend/`)

### Communication
- The frontend communicates with the backend via HTTP (REST API), Web Sockets (SignalR), etc.
- No shared code, no shared config files, no shared environment files between backend and frontend.

---

## Architecture & Design Principles

### Backend (FastAPI) — Layered Architecture

Organize code into strict layers by responsibility:

- **`app/api/`** — HTTP routes and endpoints only. No business logic here. Routes must delegate to services.
- **`app/services/`** — Business logic and AI orchestration. Services contain the core application intelligence and coordinate between repositories and external systems.
- **`app/repositories/`** — Data access layer. All database operations must go through repositories. Repositories expose simple CRUD-like interfaces.
- **`app/models/`** — Pydantic schemas, request/response models, and data validation. Database models may live here or in repositories depending on scale.

**Key Rule:** Endpoints must never contain business logic. An endpoint should:
1. Parse/validate the request
2. Call a service
3. Return the response

Use **Dependency Injection** (FastAPI's `Depends()`) to inject services and repositories into route handlers.

### Frontend (React) — Feature-Based Architecture

Organize by domain/feature, not by file type:

- **`src/features/<domain_name>/`** — Self-contained feature folders. Each feature can have its own components, hooks, types, utils, and styles.
  - `src/features/health/` (example)
    - `HealthCheck.tsx`
    - `useHealth.ts` (custom hook)
    - `types.ts`
- **`src/components/`** — Global, reusable UI components that are feature-agnostic (Button, Modal, Card, etc.).

**Key Rule:** Features are self-contained. Avoid reaching across feature boundaries; instead, lift shared logic to global components or hooks.

### Design Principles

1. **SOLID Principles:** Code must adhere to Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion principles.

2. **Dependency Injection (Backend):** Use FastAPI's `Depends()` to inject services into route handlers. Avoid tight coupling and make testing easier.

3. **Composition Over Inheritance (Frontend):** Favor React hooks and component composition. Minimize class-based components and deep inheritance hierarchies.

### Progressive Unfolding

Do not create these folders and structure until a feature explicitly requires them. Start simple and evolve the structure as the application grows. Premature folder creation adds unnecessary complexity.
