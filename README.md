# riemer.fyi Frontend - Next.js + tRPC

Modern Next.js 15 frontend with full type-safety via tRPC.

## 🚀 Quick Start

### 1. Start the Backend (tRPC API)

```bash
# In a separate terminal
cd /home/thartist/Desktop/riemerFYI/backoffice
npm start
```

The backend will run on **http://localhost:7000**

### 2. Start the Frontend

```bash
cd /home/thartist/Desktop/riemerFYI/frontend-next
npm run dev
```

The frontend will run on **http://localhost:3000**

### 3. Open in Browser

Navigate to **http://localhost:3000** - it will redirect to `/dashboard`

## 📁 What's Built

### ✅ Working Pages
- **Dashboard** - Real-time stats (income, expenses, profit)
- **Companies** - Full CRUD with type safety
- **Projects** - List view with client relationships

### 🚧 Placeholder Pages (Backend routers needed)
- **Invoices** - Need `invoiceRouter.ts`
- **Expenses** - Need `expenseRouter.ts` (incoming invoices)
- **Time Entries** - Need `timeEntryRouter.ts`
- **Reports** - Need additional reporting endpoints

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Type Safety:** tRPC + TypeScript
- **UI Components:** shadcn/ui (Radix UI + Tailwind)
- **Data Fetching:** TanStack React Query
- **Styling:** Tailwind CSS
- **Icons:** Lucide React

## 📡 Available tRPC Endpoints

### Companies
- `trpc.company.getAll.useQuery()` ✅
- `trpc.company.create.useMutation()` ✅
- More in backend...

### Projects
- `trpc.project.getAll.useQuery()` ✅

### Reporting
- `trpc.reporting.getDashboardStats.useQuery()` ✅
- `trpc.reporting.getProfitLossSummary.useQuery()` ✅

## 🔧 Development

```bash
# Start dev server
npm run dev

# Build
npm run build

# Lint
npm run lint
```

## 📚 Documentation

- [Migration Plan](../FRONTEND_MIGRATION_PLAN.md)
- [Type Schemas](../FRONTEND_TYPE_SCHEMAS.md)
- [tRPC Docs](https://trpc.io/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)

## 🎉 Success!

The foundation is complete - just add the remaining backend routers and you're ready to go!
