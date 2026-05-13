# CyberSec Consistency Tracker

A modern, secure full-stack web app to help cybersecurity Discord communities maintain daily consistency through task tracking, streaks, and leaderboards.

## Tech Stack
- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** (dark cyber theme)
- **MongoDB** + Mongoose
- **NextAuth v5** (Credentials provider)
- **Recharts** (analytics)
- **bcryptjs** (password hashing)
- **Zod** (validation)

## Features
- Email/password auth with rate limiting
- Daily task creation window (10 PM - 12 AM enforcement)
- Task finalization flow: **DONE** requires "what I learned", **STUCK** requires a reason
- Streak tracking (current, best, active days) + stuck visibility
- Dashboard with stats cards
- Public leaderboard with streak badges
- Analytics charts (weekly + monthly)
- Profile page with editable username and **Public/Private** activity toggle (default Public)
- Public activity feed with moderation support
- Admin panel (`/admin`) for users/tasks/activity control
- Responsive dark cyber-themed UI

## Setup

### 1. Clone and install
```bash
git clone <repo>
cd productive_app
npm install
```

### 2. Environment variables
```bash
cp .env.example .env.local
```
Edit `.env.local`:
```
MONGODB_URI=mongodb://localhost:27017/cybersec_tracker
NEXTAUTH_SECRET=your-secret-key-at-least-32-chars
NEXTAUTH_URL=http://localhost:3000
ADMIN_EMAIL=owner-admin@example.com
ADMIN_PASSWORD=change-this-admin-password
ADMIN_USERNAME=Owner Admin
```

### Admin bootstrap (single admin)
- Set `ADMIN_EMAIL` + `ADMIN_PASSWORD` (and optional `ADMIN_USERNAME`) in environment variables.
- On first authentication attempt, if no admin exists, the app bootstraps exactly one admin user.
- Admin uses the same login flow, then accesses `/admin`.

### 3. Run
```bash
npm run dev
```
Open http://localhost:3000

## Notes
- Task creation is enforced server-side between 10:00 PM and 12:00 AM
- Task deletion is disabled by design
- Public feed only returns activities from users with `isPublic=true` and `isDisabled=false`
- Streaks reset if no task activity for 24h
- Rate limiting: 5 requests per 15 min window for auth routes
