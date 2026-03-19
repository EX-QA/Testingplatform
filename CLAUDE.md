# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TestHub (QAForge)** - A full-stack test management platform for QA teams.

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + Prisma ORM + SQLite
- **API Base**: `/api/v1`
- **Swagger Docs**: `http://localhost:3001/api-docs` (when backend running)

## Common Commands

### Frontend (port 5173)
```bash
cd frontend
npm install
npm run dev      # Start dev server
npm run build    # Production build
```

### Backend (port 3001)
```bash
cd backend
npm install
npm run dev              # Start with tsx watch
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Run database migrations
npm run build           # Compile TypeScript
```

## Architecture

### Frontend Structure
- `src/App.tsx` - Main app with React Router, sidebar navigation, auth guard
- `src/pages/` - Page components: TestCases, TestPlans, Defects, ApiTests, Automation, Login, Register
- `src/services/api.ts` - Axios API client with auth interceptor

### Backend Structure
- `src/index.ts` - Express app setup, Swagger UI, route mounting
- `src/routes/` - API route modules: testCases, testPlans, defects, apiTests, automation, auth
- `src/prisma/index.ts` - Prisma client singleton
- `prisma/schema.prisma` - Database schema (SQLite)

### Data Models (Prisma)
- `TestCase` - Test case with title, module, priority, type, steps, status
- `TestPlan` - Test plan with status, dates, linked cases
- `PlanItem` - Junction table for plan-case relationships
- `PlanExecution` - Execution records for test plans
- `Defect` - Bug tracking with severity, priority, status
- `ApiTest` - Saved API test configurations
- `ApiTestHistory` - Execution history for API tests
- `AutomationScript` - Python automation scripts
- `User` - Authentication (username, email, bcrypt hashed password)

## API Endpoints

| Module | Endpoints |
|--------|-----------|
| Auth | POST /api/v1/auth/register, /login |
| Test Cases | GET/POST /test-cases, PUT/DELETE /:id |
| Test Plans | GET/POST /test-plans, PUT/DELETE /:id, POST /:id/execute |
| Defects | GET/POST /defects, PUT/DELETE /:id |
| API Tests | POST /api-tests/execute, GET /history, POST /save |
| Automation | GET/POST /automation/scripts, PUT/DELETE /:id, POST /:id/execute |

## Key Implementation Details

- **Python Execution**: API tests and automation scripts execute via Node child_process (not Pyodide)
- **Authentication**: JWT stored in localStorage, axios interceptor adds Authorization header
- **Database**: SQLite file at `backend/prisma/dev.db`
- **UI Theme**: Dark sidebar (#1e293b), CSS Variables for colors, Lucide React icons

## Project Rules

This project uses custom rules in `.claude/rules/`:
- TypeScript rules for frontend/backend TypeScript code
- Python rules for automation scripts
- Common rules: coding-style, testing (80% min coverage), security, git-workflow
