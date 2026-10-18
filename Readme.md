# GoTrust Underwriting System

Automated Property & Casualty (P&C) underwriting platform with AI risk scoring, Supabase Auth, and an admin dashboard.

**Live demo:** https://nom-insurance-backend.onrender.com

---

## Features

- Instant AI-powered risk evaluation (Google Gemini 1.5 Flash) with actuarial fallback
- Public underwriting form + companies directory
- Supabase Auth (email/password)
- Admin dashboard protected by role + extra passkey
  - Review & update all applications
  - Add / edit / deactivate companies
  - View users and grant/revoke admin role

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | Static HTML + Tailwind + vanilla JS |
| Backend      | Node.js + Express                   |
| Auth & DB    | Supabase (Auth + Postgres)          |
| AI           | Google Gemini 1.5 Flash             |

---

## Quick Start

### 1. Clone & install
```bash
git clone https://github.com/PrevailUgah/Nom-Insurance-Underwriting.git
cd Nom-Insurance-Underwriting
npm install