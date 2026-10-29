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

##  Quickstart Guide

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
