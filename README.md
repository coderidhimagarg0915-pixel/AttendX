# AttendX — Premium Classroom Attendance Platform

AttendX is a high-integrity, responsive academic SaaS platform engineered for university students and faculty members. It prevents proxy attendance through dynamic cryptographic session tokens, server-enforced PostgreSQL Row-Level Security (RLS), and dedicated dual dashboards for instructors and students.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, TypeScript (Strict Mode)
- **Styling:** Tailwind CSS (Academic SaaS Design System)
- **Routing:** React Router v6
- **Database & Auth:** Supabase (PostgreSQL, Row-Level Security, Database RPCs)
- **Validation:** Zod (Untrusted input parsing)
- **Testing:** Vitest, React Testing Library, jsdom
- **Icons:** Lucide React

---

## 👥 Team Distribution (Team of 4)

| Member | Primary Responsibility | Key Focus Areas |
| :--- | :--- | :--- |
| **Dev 1 (Tech Lead / Core)** | System Architecture & Database | Supabase schema migrations, RLS policies, Auth triggers, RPC procedures, CI/CD pipeline |
| **Dev 2 (Frontend Specialist)** | Teacher Portal & Session Control | Faculty Dashboard, Dynamic Code Generator, Live Attendee Monitor, Roster overrides |
| **Dev 3 (Frontend Specialist)** | Student Portal & Verification | Student Check-in Terminal, Enrolled courses view, Threshold alerts (&lt;75%), Mobile check-in |
| **Dev 4 (QA / UI & Analytics)** | Design System & Reporting | Reusable UI components (Card, Button, Modal, Table), CSV analytics export, Vitest suite |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js** (v20+ recommended)
- **npm** or **pnpm**
- **Git**

### 2. Clone & Setup
```bash
# Clone the repository
git clone https://github.com/YOUR_ORGANIZATION_OR_USERNAME/attendx.git
cd attendx

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.

### 3. Development Server
```bash
npm run dev
```

### 4. Running Tests & Strict Typechecking
```bash
# Run unit tests
npm run test

# Type-check and production build
npm run build
```

---

## 🔒 AttendX Engineering Rules

1. **Work in Small Milestones:** Never jump ahead without team alignment and explicit user request.
2. **Strict TypeScript:** No implicit `any`, unused variables, or unsafe casts.
3. **Server-Side Enforcement:** Route guards alone are insufficient. All roles, enrollment checks, and attendance verification MUST be validated in PostgreSQL RLS & stored procedures.
4. **Never Expose Service-Role Keys:** The Supabase `service_role` key must NEVER exist in client-side code.
5. **No False Positives:** Never mark a student present solely because the browser reports 200 OK. Verification requires database confirmation.
6. **Prototype Transparency:** Prototype mock data must always be flagged with a warning banner.

---

## 📂 Repository Layout

```
attendx/
├── .github/
│   ├── workflows/ci.yml           # Automated CI tests on push/PR
│   ├── pull_request_template.md   # Engineering checklist for all PRs
│   └── ISSUE_TEMPLATE/            # Structured feature and bug templates
├── src/
│   ├── components/                # Reusable design system (Button, Card, Badge)
│   ├── layouts/                   # TeacherLayout, StudentLayout
│   ├── pages/
│   │   ├── LandingPage.tsx        # Gateway portal
│   │   ├── teacher/               # Faculty Dashboard & Session Monitor
│   │   └── student/               # Student Check-In Terminal & Roster
│   ├── lib/
│   │   ├── supabase.ts            # Safe anon-key Supabase client
│   │   └── validation.ts          # Zod validation schemas
│   ├── types/                     # Strict TypeScript interfaces & DB types
│   └── test/                      # Vitest test suites
├── supabase/
│   └── migrations/                # Version-controlled PostgreSQL schemas & RLS
├── .env.example                   # Sanitized environment template
├── tailwind.config.js             # SaaS design system tokens
├── vite.config.ts                 # Vite & Vitest configuration
└── tsconfig.json                  # Strict compiler options
```
