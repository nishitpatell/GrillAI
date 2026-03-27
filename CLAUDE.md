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
- The frontend communicates with the backend exclusively via HTTP (REST API).
- No shared code, no shared config files, no shared environment files between backend and frontend.
