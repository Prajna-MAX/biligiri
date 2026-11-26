# Biligiri: Admin & Worker Task Management (MERN)

MongoDB · Express · React (Vite) · Node.js

## Features

**Admin dashboard**
- Stats: total, pending, in progress, completed, worker count, average customer rating
- Assign tasks to workers (title, description, customer, location, priority, due date)
- Track every task, filtered by status and worker; edit, reassign, change status, delete
- See each task's progress timeline (worker status changes and notes)
- Manage workers (add, remove) and see each worker's task counts
- **Feedback** tab lists all customer feedback (rating, comment, customer, worker, task)

**Worker dashboard**
- Shows **only the tasks assigned to that worker** (enforced on the server)
- Start work → Mark complete, add progress notes
- After completing a task, record the customer's feedback (1–5 stars and a comment)

**Customer feedback page (no login)**
- Every task gets a private link: `https://<site>/f/<token>`
- After completing a task the worker sends it with one tap (WhatsApp to the customer's number, Copy, or Share)
- The customer sees the job status and rates it (1–5 stars + comment); they can change it later
- Admin sees each rating labelled *From customer* or *Recorded by worker*

**Notifications**
- Bell with unread count for admins and workers (checks every 30 s and when the app is reopened)
- Workers: new task assigned, task reassigned away. Admins: task completed, customer feedback received. Workers also see their customers' ratings.
- Phone/desktop alerts (web push) after tapping **Turn on alerts** in the bell. Android and desktop: works in the browser.
  iPhone: add Biligiri to the Home Screen first (Share → Add to Home Screen), then turn on alerts from there.
- Push keys are generated automatically and stored in the database (or set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`).

## Setup

Requirements: Node 18+ and MongoDB running locally (or a MongoDB Atlas URI).

```bash
npm run install-all
cp server/.env.example server/.env   # then set JWT_SECRET (and MONGO_URI if not local)
npm run seed                          # creates admin: phone 9999999999 / password admin123
npm run dev                           # API on :5000, React on http://localhost:5173
```

Log in as the admin with **phone number + password**, add workers in the **Workers** tab (phone required, email optional), and give them their phone number and password.
**Change the admin login**: set `ADMIN_PHONE` / `ADMIN_PASSWORD` in `server/.env` before seeding.

### Deploy publicly (Render + MongoDB Atlas, both free)

1. **Database:** at [mongodb.com/atlas](https://www.mongodb.com/atlas) create a free M0 cluster, a database
   user, and under *Network Access* allow `0.0.0.0/0`. Copy the connection string and put
   `/biligiri` before the `?`, e.g. `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/biligiri?retryWrites=true&w=majority`.
2. **Code:** push this folder to a GitHub repository (`.env` and `node_modules` are git-ignored).
3. **Hosting:** at [render.com](https://render.com) choose *New → Blueprint*, select the repo (it reads `render.yaml`),
   and fill in `MONGO_URI`, `ADMIN_PHONE`, `ADMIN_PASSWORD`. `JWT_SECRET` is generated automatically.
4. Open the `https://<name>.onrender.com` URL and log in with the admin phone and password.

Free Render services sleep after ~15 minutes idle; the first visit after that takes ~30–50 seconds.

### Production (any host)

```bash
npm run build   # builds React into client/dist
npm start       # Express serves the API and the built app on :5000
```

## API

| Method | Route | Who | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | all | Log in with `{ phone, password }`, returns a JWT |
| GET | `/api/auth/me` | all | Current user |
| GET/POST | `/api/users` | admin | List / add workers |
| DELETE | `/api/users/:id` | admin | Remove worker (only if no open tasks) |
| GET | `/api/tasks?status=&worker=` | both | Admin: all tasks · Worker: own tasks only |
| GET | `/api/tasks/stats` | admin | Dashboard numbers |
| GET | `/api/tasks/feedback` | admin | All tasks with feedback |
| POST | `/api/tasks` | admin | Assign a task |
| PUT | `/api/tasks/:id` | both | Admin: any field · Worker: status only |
| POST | `/api/tasks/:id/updates` | both | Add a progress note |
| POST | `/api/tasks/:id/feedback` | worker | Record customer feedback (task must be completed) |
| DELETE | `/api/tasks/:id` | admin | Delete task |
| GET | `/api/notifications` | both | Latest notifications + unread count |
| POST | `/api/notifications/read-all`, `/:id/read` | both | Mark read |
| POST | `/api/notifications/push/subscribe` | both | Register this device for push alerts |
| GET/POST | `/api/public/feedback/:token` | anyone with the link | Customer job view / submit rating (rate-limited) |

## Structure

```
server/  models/ (User, Task) · routes/ (auth, users, tasks) · middleware/auth.js · seed.js
client/  src/pages/ (Login, AdminDashboard, WorkerDashboard) · components/ · api.js · auth.jsx
```
