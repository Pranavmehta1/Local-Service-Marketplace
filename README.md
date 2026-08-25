# LocalFix — Local Service Marketplace

"Trusted local services, right at your doorstep."

A full-stack home-services marketplace (Electrician, Plumber, AC Repair, RO
Repair, Carpenter, Cleaning, Appliance Repair) with three roles — Customer,
Service Worker, and Admin — built as a college portfolio project.

See **ARCHITECTURE.md** for the full architecture, database schema, API
endpoint plan, and auth flow — read that first, it's the map for everything
below.

---

## Project layout

```
localfix/
├── ARCHITECTURE.md      ← full plan: schema, API, auth flow, pages
├── backend/              ← Node.js + Express + MongoDB + JWT
└── frontend/              ← HTML + CSS + vanilla JS + Bootstrap 5
```

## Running the backend

```bash
cd backend
npm install
cp .env.example .env        # then edit MONGO_URI / JWT_SECRET if needed
npm run seed                 # populates sample customers/workers/bookings
npm run dev                   # starts the API on http://localhost:5000
```

Requires a MongoDB instance — either local (`mongodb://127.0.0.1:27017/localfix`)
or a free MongoDB Atlas cluster (paste its connection string into `.env`).

Sample logins created by the seed script:
- Admin: `admin@localfix.com` / `admin123`
- Customer: `neha@example.com` / `password123`
- Worker: `rahul@localfix.com` / `password123`

## Running the frontend

The frontend is static HTML/CSS/JS — no build step. Two ways to view it:

1. **Standalone demo (no backend needed):** just open `frontend/index.html`
   in a browser. Every page is pre-populated from `frontend/js/sampleData.js`
   so it looks and behaves like a live app for a presentation/viva.
2. **Connected to the real API:** serve the `frontend/` folder with any
   static server (e.g. `npx serve frontend`) once the backend is running.
   `frontend/js/api.js` is the fetch wrapper already wired to
   `http://localhost:5000/api` with JWT auth — swap the dashboards' sample
   data calls for `LocalFixAPI.get(...)` calls to go fully live.

## What's implemented

- **Backend:** all 6 models, JWT auth with role-based middleware, full REST
  API (auth, users, workers, bookings, complaints, reviews, notifications,
  admin), service-scoped complaint filtering, a seed script with realistic
  sample data.
- **Frontend:** landing page (animated hero, service cards, how-it-works,
  top workers, stats, testimonials), role-based auth page, customer/worker/
  admin dashboards with sidebar nav, worker search with filters/sort, worker
  profile with rating breakdown, a 7-step booking wizard, 404/unauthorized
  empty states, Chart.js charts for earnings and platform analytics.

## Suggested next steps if you continue building

- Wire the dashboard JS files to `LocalFixAPI` instead of `sampleData.js`
  once you're ready to demo against the live backend.
- Add the "Customers" / "Workers" / "Bookings" / "Reviews" / "Services" /
  "Reports" / "Settings" admin sub-pages (the sidebar links are in place,
  the overview page is fully built).
- Add image upload for complaint evidence and profile photos (Cloudinary or
  local `multer` storage both work fine for a college project).
- Deploy: backend to Render/Railway, frontend to Netlify/Vercel, DB to
  MongoDB Atlas — all have free tiers suitable for a portfolio deployment.
