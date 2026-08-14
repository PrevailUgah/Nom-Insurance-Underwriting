# NOM Underwriting System — System Setup & Architecture

**NOM Underwriting System** is an automated Property & Casualty (P&C) insurance underwriting platform built with a modern web frontend, an Express API backend, Google Gemini AI risk analysis, and cloud PostgreSQL database persistence.

---

## 🏗️ End-to-End Architecture Overview

```
[ User Browser (Frontend UI) ]
      │
      │ 1. Form Submission (JSON Payload)
      ▼
[ Node.js / Express Server (server.js) ]
      │
      ├───▶ 2. Primary AI Engine: Google Gemini 1.5 Flash (Generates Risk Score, Decision & AI Rationale)
      │        └─ (Automatic Fallback to Deterministic Actuarial Engine if API unconfigured)
      │
      └───▶ 3. Cloud Database: Neon PostgreSQL (Inserts Record into `evaluations` Table & Returns ID)
      │
      ▼
[ Client Browser (Pop-up Output Modal + NGN Quote Display) ]
```

---

## 🛠️ Step-by-Step Setup: Frontend to Database

### 1. Frontend Layer (`public/`)
- **Landing Page (`public/index.html`)**:
  - Displays the platform overview, interactive asset matrix (Commercial Real Estate, Industrial Fleet, Marine Cargo, Data Center Infra), and **"Insure Now"** CTA buttons.
- **Form Submission Portal (`public/form.html`)**:
  - Captures Insured Entity Identification (Legal Name, Corporate Email, Phone Number).
  - Captures Asset Risk Exposure Metrics (Asset Classification, Total Insured Value NGN, Operational Age, 5-Year Claims History).
- **Client Script (`public/app.js`)**:
  - Intercepts form submission and constructs the JSON payload.
  - Sends a `POST` request to `/api/underwrite`.
  - Displays the result pop-up modal showing **Decision Status** (Approved / Manual Review / Declined), **Risk Score**, **Multiplier**, **Estimated Premium (₦)**, and **Gemini AI Rationale**.
  - Includes a client-side actuarial fallback calculator if the network or API is offline.
- **Styling (`public/styles.css`)**:
  - Custom dark blue glassmorphism theme built on Tailwind CSS, glowing button states, and dark input field controls.

---

### 2. Backend API Layer (`server.js`)
- **Server Framework**: Node.js >=18 with Express.
- **Middleware**: `cors()` for cross-origin requests, `express.json()` for parsing incoming JSON bodies, and `express.static('public')` for serving frontend files.
- **Parameter Normalization**: Standardizes request payload properties (`replacementValue` / `assetValue`, `phone` / `phoneNumber`) to ensure seamless data mapping.

---

### 3. AI Intelligence Engine Layer (Google Gemini API)
- **SDK**: `@google/generative-ai` (`gemini-1.5-flash` model).
- **Environment Configuration**: Key configured in `.env` as `GEMINI_API_KEY`.
- **Underwriting Evaluation**:
  - Receives asset metrics and prompts Gemini AI to act as a senior actuarial underwriter.
  - Generates structured JSON output containing `decision`, `riskLevel`, `riskScore`, `multiplier`, `estimatedPremium`, and `aiAnalysis` (1-2 sentence risk rationale).
- **Graceful Fallback**: If `GEMINI_API_KEY` is not set or API limits are reached, the server automatically executes deterministic actuarial rating math:
  - Base Rate: `2.0% (0.02)` of Total Insured Value.
  - Claims Surcharge: Adds `+1.5%` base rate if claims > 2.
  - Manual Review: Triggered if prior claims count &ge; 3.

---

### 4. Cloud Database Layer (Neon PostgreSQL)
- **Database Service**: Neon Serverless PostgreSQL.
- **Driver**: `pg` Pool instance with SSL connection (`sslmode=require`).
- **Connection String**: Configured in `.env` as `DATABASE_URL`.
- **Database Schema (`evaluations` Table)**:

```sql
CREATE TABLE IF NOT EXISTS evaluations (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50),
  asset_value NUMERIC(15, 2) NOT NULL,
  claims_history INT NOT NULL DEFAULT 0,
  decision VARCHAR(100) NOT NULL,
  risk_level VARCHAR(100) NOT NULL,
  estimated_premium NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

- **Persistence Execution**:
  - Every evaluation is inserted via SQL:
    ```sql
    INSERT INTO evaluations 
      (full_name, email, phone_number, asset_value, claims_history, decision, risk_level, estimated_premium)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id;
    ```
  - Returns the auto-generated record ID (`savedRecordId`) to the frontend for audit logging.

---

## 📡 API Contract Reference

### Endpoint
`POST /api/underwrite`

### Request Body (JSON)
```json
{
  "fullName": "Acme Logistics Ltd",
  "email": "risk@acme.com",
  "phone": "+234 (800) 123-4567",
  "assetType": "Commercial Real Estate",
  "replacementValue": 50000000,
  "assetAge": 3,
  "claimsHistory": 1
}
```

### Response Body (JSON)
```json
{
  "success": true,
  "decision": "Approved",
  "riskLevel": "Low",
  "riskScore": 18,
  "multiplier": "1.0x",
  "estimatedPremium": 1000000,
  "currency": "NGN",
  "isAiEvaluated": true,
  "aiAnalysis": "Low risk profile based on 3-year asset operational age and clean prior claims record.",
  "savedRecordId": 89651,
  "timestamp": "2026-08-14T05:00:25.828Z"
}
```

---

## 🚀 How to Run Locally

### 1. Installation
```bash
git clone https://github.com/PrevailUgah/Nom-Insurance-Underwriting.git
cd Nom-Insurance-Underwriting
npm install
```

### 2. Configure Environment (`.env`)
Create a `.env` file in the root directory:
```env
PORT=3000
GEMINI_API_KEY=your_google_gemini_api_key_here
DATABASE_URL=postgresql://username:password@ep-host.aws.neon.tech/neondb?sslmode=require
```

### 3. Start Server
```bash
npm start
# or for development
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## 📂 Repository Structure
```
Nom-Insurance-Underwriting/
├── Readme.md               # Complete System Setup & Architecture Documentation
├── package.json            # Node.js dependencies & scripts
├── server.js               # Express API server, Gemini AI integration & Neon DB persistence
├── .env                    # Environment variables (Git-ignored)
├── .gitignore              # Git ignore rules
└── public/                 # Static web application files
    ├── index.html          # Landing Page
    ├── form.html           # Risk Evaluation Form Portal
    ├── styles.css          # Dark Blue Glassmorphism Stylesheet
    ├── app.js              # Client logic & modal handler
    └── nom_logo.png        # Brand emblem asset
```
