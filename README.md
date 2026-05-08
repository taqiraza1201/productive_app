# CyberSec Consistency Tracker

A modern, secure full-stack web app to help cybersecurity Discord communities maintain daily consistency through task tracking, streaks, and leaderboards.

## Tech Stack
- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** (dark cyber theme)
- **MongoDB** + Mongoose
- **NextAuth v5** (Credentials provider)
- **Recharts** (analytics)
- **bcryptjs** (password hashing)
- **Zod** (validation)

## Features
- Email/password auth with rate limiting
- Daily task creation window (10 PM - 12 AM enforcement)
- Streak tracking (current, best, active days)
- Dashboard with stats cards
- Public leaderboard with streak badges
- Analytics charts (weekly + monthly)
- Profile page with editable username
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
```

### 3. Run
```bash
npm run dev
```
Open http://localhost:3000

## Notes
- Task creation is enforced server-side between 10:00 PM and 12:00 AM
- Streaks reset if no task activity for 24h
- Rate limiting: 5 requests per 15 min window for auth routes
