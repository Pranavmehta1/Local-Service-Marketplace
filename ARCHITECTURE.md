# LocalFix — Architecture & Build Plan

"Trusted local services, right at your doorstep."

This document is the blueprint. Everything after it (backend code, frontend
pages) is built to match it exactly, so you can walk an examiner through it
top-down in a viva: idea → roles → data → API → screens.

---

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | HTML5, CSS3, vanilla JS, Bootstrap 5 | No build step, easy to demo, still shows real JS fundamentals |
| Backend | Node.js + Express.js | Simple REST API, huge documentation/community for a viva |
| Database | MongoDB + Mongoose | Flexible schema fits nested worker/complaint data |
| Auth | JWT (JSON Web Tokens) + bcrypt | Stateless, standard, easy to explain |
| Icons | Bootstrap Icons | Consistent, no extra asset pipeline |

---

## 2. Folder Structure

```
localfix/
├── backend/
│   ├── config/
│   │   └── db.js                 # Mongo connection
│   ├── models/
│   │   ├── User.js
│   │   ├── Worker.js
│   │   ├── Booking.js
│   │   ├── Complaint.js
│   │   ├── Review.js
│   │   └── Notification.js
│   ├── middleware/
│   │   ├── auth.js               # verifies JWT, attaches req.user
│   │   ├── role.js                # requireRole('admin') etc.
│   │   └── errorHandler.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── workerController.js
│   │   ├── bookingController.js
│   │   ├── complaintController.js
│   │   ├── reviewController.js
│   │   └── notificationController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── workerRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── complaintRoutes.js
│   │   ├── reviewRoutes.js
│   │   └── notificationRoutes.js
│   ├── utils/
│   │   └── seedData.js           # sample customers/workers/bookings
│   ├── .env.example
│   ├── server.js
│   └── package.json
│
└── frontend/
    ├── index.html                 # public landing page
    ├── pages/
    │   ├── auth.html               # login / register (customer + worker)
    │   ├── customer-dashboard.html
    │   ├── worker-dashboard.html
    │   ├── admin-dashboard.html
    │   ├── worker-search.html
    │   ├── worker-profile.html
    │   ├── booking.html
    │   ├── 404.html
    │   └── unauthorized.html
    ├── css/
    │   ├── style.css               # design tokens + shared UI
    │   └── dashboard.css           # sidebar/dashboard-only styles
    ├── js/
    │   ├── api.js                  # fetch wrapper (adds JWT header)
    │   ├── auth.js                 # login/register form logic
    │   ├── landing.js               # hero typing animation, scroll reveals
    │   ├── customer-dashboard.js
    │   ├── worker-dashboard.js
    │   ├── admin-dashboard.js
    │   └── sampleData.js            # in-browser fallback demo data
    └── assets/
        └── (avatars/icons if added)
```

---

## 3. Database Schema (Mongoose)

**User** — shared identity for customer/worker/admin
```
name, email (unique), phone, password (hashed), role: 'customer'|'worker'|'admin',
location, profileImage, isSuspended, createdAt
```

**Worker** — extra profile, 1:1 with a User(role=worker)
```
userId (ref User), serviceCategory: enum[electrician, plumber, ac_repair,
ro_repair, carpenter, cleaning, appliance_repair], experience (years),
skills: [String], pricing: { startingPrice }, serviceArea, workingHours,
verificationStatus: 'pending'|'approved'|'rejected', rating (avg),
totalReviews, completedJobs, earnings, createdAt
```

**Booking**
```
customerId (ref User), workerId (ref Worker), serviceCategory,
problemDescription, address, date, timeSlot, status: 'requested'|'accepted'|
'in_progress'|'completed'|'rejected'|'cancelled', price, createdAt
```

**Complaint**
```
customerId (ref User), workerId (ref Worker), bookingId (ref Booking),
serviceCategory, subject, description, priority: 'low'|'medium'|'high',
status: 'pending'|'under_review'|'resolved'|'rejected', adminNote, createdAt
```
Service-scoping rule: a worker's complaint list is always filtered server-side
by `serviceCategory == worker.serviceCategory AND workerId == worker._id` —
never trusted from the frontend. Admin's query has no such filter.

**Review**
```
customerId (ref User), workerId (ref Worker), bookingId (ref Booking),
rating (1-5), comment, createdAt
```

**Notification**
```
userId (ref User), title, message, type: 'booking'|'review'|'complaint'|
'system', isRead, createdAt
```

---

## 4. API Endpoint Plan

```
Auth
POST   /api/auth/register/customer
POST   /api/auth/register/worker
POST   /api/auth/login
GET    /api/auth/me                       [protected]

Users
GET    /api/users/profile                 [protected]
PUT    /api/users/profile                 [protected]

Workers
GET    /api/workers                       ?category=&rating=&price=&sort=
GET    /api/workers/:id
PUT    /api/workers/profile               [worker]
PUT    /api/workers/availability          [worker]
GET    /api/workers/:id/reviews

Bookings
POST   /api/bookings                      [customer]
GET    /api/bookings/customer             [customer] — own history
GET    /api/bookings/worker               [worker]   — own requests/jobs
PUT    /api/bookings/:id/status           [worker]   — accept/reject/progress/complete
PUT    /api/bookings/:id/cancel           [customer]

Complaints
POST   /api/complaints                    [customer]
GET    /api/complaints/customer           [customer]
GET    /api/complaints/worker             [worker]   — auto-filtered by own category
GET    /api/complaints/admin              [admin]    — all, all categories
PUT    /api/complaints/:id/status         [admin]

Reviews
POST   /api/reviews                       [customer] — only on completed booking
GET    /api/reviews/worker/:workerId

Notifications
GET    /api/notifications                 [protected]
PUT    /api/notifications/:id/read        [protected]

Admin
GET    /api/admin/overview                [admin] — dashboard stats
GET    /api/admin/workers/pending         [admin]
PUT    /api/admin/workers/:id/verify      [admin]
PUT    /api/admin/users/:id/suspend       [admin]
DELETE /api/admin/reviews/:id             [admin]
```

---

## 5. Authentication & Authorization Flow

1. Register → password hashed with bcrypt → User created (role fixed by which
   endpoint was called, never taken from a body field the client controls).
   Worker registration also creates a linked `Worker` doc with
   `verificationStatus: 'pending'`.
2. Login → verify hash → sign JWT containing `{ id, role }` → returned to
   client, stored in `localStorage`.
3. Every protected request sends `Authorization: Bearer <token>`.
4. `middleware/auth.js` verifies the token and attaches `req.user`.
5. `middleware/role.js` (`requireRole('admin')`) checks `req.user.role`
   **from the verified token**, never from the request body — this is what
   stops a customer from hitting `/api/admin/*` by editing the URL.
6. Worker-only complaint/booking queries additionally filter by
   `req.user.id` server-side, so a worker can never see another worker's data
   even if they guess an ID.
7. Frontend also redirects on the client (nicer UX) but the real boundary is
   always the backend check — that's the point to make in a viva if asked
   "what stops someone from just changing the URL."

---

## 6. Page / Component Plan

- `index.html` — hero (animated "Need a plumber? / electrician? / AC
  repaired?" phrase swap), service category cards, how-it-works (5 steps),
  top-rated workers, testimonials, stats counter, CTA, footer
- `pages/auth.html` — role picker (Customer / Worker) → matching form
- `pages/worker-search.html` — category results, filter/sort sidebar, worker cards
- `pages/worker-profile.html` — full profile, reviews, Book Now / Report
- `pages/booking.html` — 7-step booking flow
- `pages/customer-dashboard.html` — sidebar + stat cards + bookings table
- `pages/worker-dashboard.html` — sidebar + requests + earnings chart
- `pages/admin-dashboard.html` — sidebar + platform-wide stats + management tables
- `pages/404.html`, `pages/unauthorized.html` — empty/error states

---

## 7. Design Tokens (Sky Blue + Black + White, SaaS-clean)

- Colors: `--lf-primary:#0EA5E9` (sky blue), `--lf-primary-dark:#0369A1`,
  `--lf-ink:#0B1120` (near-black), `--lf-surface:#FFFFFF`,
  `--lf-muted:#F1F5F9` (soft gray section bg), `--lf-success:#16A34A`,
  `--lf-warning:#D97706`, `--lf-danger:#DC2626`
- Type: **Sora** for display/headings (geometric, confident, startup feel),
  **Inter** for body/UI text, **JetBrains Mono** for numeric stats, prices,
  booking IDs — gives the dashboards a "real product" data feel
- Signature element: a small pulsing green dot + "Available now" label on
  worker cards — reinforces the core promise (find someone *right now*)
  without relying on generic numbered-step icons everywhere
- Radius: 16px cards, 10px buttons/inputs · Shadows: soft, colored (sky-blue
  tinted, not pure black) · Motion: fade-up on scroll via IntersectionObserver,
  short 150–200ms hover transitions, no more than that

---

## 8. Build Order (what gets generated, in sequence)

1. This architecture doc ✅
2. Backend: models → middleware → controllers → routes → server.js → seed data
3. Frontend: design tokens (`style.css`) → landing page → auth page →
   dashboards (customer → worker → admin) → search/profile/booking pages
4. Sample data wired in so every screen looks populated on first load
