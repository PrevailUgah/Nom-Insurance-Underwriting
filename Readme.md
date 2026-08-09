# Nom Insurance — Underwriting System (Final Year Project)

Nom Insurance Underwriting is a lightweight, standalone Property & Casualty (P&C) underwriting prototype built as a demonstration of automated risk scoring, premium estimation, and decision automation for academic evaluation. It combines a single-page front-end (Vanilla JS + HTML/CSS) with a small Node.js/Express backend. The system demonstrates two underwriting engines:

- A Primary AI Engine (planned) that would use Google Gemini for contextual risk scoring.
- A deterministic Actuarial Fallback Engine (implemented) that always runs when AI is not available.

This project is intended as a proof-of-concept for automated underwriting pipelines, explainable fallback logic, and a clean UI for interacting with underwriting results.

Table of Contents
- What this is
- Key features
- Architecture & files
- How the engines work (math & rules)
- How to run (development & production)
- API: contract & examples
- Known limitations & academic evaluation notes
- Future work & suggestions
- Project grading checklist (for professor)

---

What this is
One-paragraph summary: Nom Insurance is a teaching / research prototype showing how an underwriting pipeline might be constructed: a small Express server that exposes an underwriting endpoint and a responsive browser SPA that demonstrates client-side fallback underwriting logic and a modern UI for entering asset data. It is intended for demonstration and evaluation, not production use.

Key features
- Dual-engine approach:
  - Primary AI Engine (planned): uses Google Gemini generative API (dependency present in package.json) to produce structured risk output when configured.
  - Deterministic Actuarial Fallback Engine: implemented both on the backend (a minimal fallback in server.js) and in the browser (client-side fallback in public/app.js) to guarantee consistent behavior without external AI keys.
- Clean single-page UI implemented with Vanilla JavaScript, CSS Grid/Flexbox, semantic HTML.
- Responsive design and clear risk/premium output (NGN currency formatting).
- Simple, transparent risk scoring so graders can follow the logic and reproduce results.

Stack
- Languages: JavaScript (server + client), HTML, CSS
- Runtime / framework: Node.js >=18, Express
- Notable libs: express, cors, dotenv, @google/generative-ai (present, AI integration placeholder)

Repository layout (top-level)
```
Nom-Insurance-Underwriting/
├── Readme.md               # Original README (reviewed)
├── package.json            # Node.js metadata & scripts
├── server.js               # Express server & fallback underwriting endpoint
└── public/                 # Frontend SPA
    ├── index.html          # UI
    ├── styles.css          # Styling
    └── app.js              # Client-side logic & fallback evaluator
```

How it fits together
- Client (public/index.html + app.js) provides an input form for asset details and shows results on the same page.
- The client currently uses an in-browser fallback evaluator (evaluateFallbackRisk in public/app.js) when the AI engine is inactive. The primary AI path is a placeholder.
- The Express server exposes a POST /api/underwrite endpoint that includes a simple actuarial fallback implementation when no AI key is present. The SPA is served as static files by Express.

How the engines work (implementation detail—explainable)
A. Client-side fallback (public/app.js)
- Base score: 20
- Age factor: +3 points per year of assetAge
- Claims history: +18 points per claim (5-year claims count)
- Replacement value thresholds:
  - +15 if replacementValue > 100,000
  - +8 if replacementValue > 50,000
- Risk score clipped to 0–100

Decision mapping:
- riskScore >= 75 → Declined, multiplier = 0 (no premium)
- 45 <= riskScore < 75 → Manual Review, multiplier = 1.45
- riskScore < 45 → Approved, multiplier = 1 + (riskScore / 100) * 0.5

Premium calculation:
- baseRate = 0.02 (2% of replacement value)
- premium = replacementValue * baseRate * multiplier
- Currency formatting: Nigerian Naira (NGN) when shown

B. Server-side fallback (server.js)
- Reads formData.assetValue (fallback to 100000) and formData.claimsHistory
- baseRate = 0.02
- If claimsHistory > 2, adds 0.015 to base rate (i.e., baseRate += 0.015)
- estimatedPremium = round(assetValue * baseRate)
- Decision mapping:
  - claimsHistory >= 3 → Manual Review
  - claimsHistory === 2 → Medium risk
  - else → Approved
- Returns:
  {
    success: true,
    decision,
    riskLevel,
    estimatedPremium,
    currency: 'NGN',
    timestamp
  }

Note: There is a slight mismatch in field names between client (replacementValue) and server (assetValue). See "Notes & suggestions" below.

How to run (quick start)
1. Clone & install
```bash
git clone https://github.com/PrevailUgah/Nom-Insurance-Underwriting.git
cd Nom-Insurance-Underwriting
npm install
```

2. Environment
Create a `.env` file (or set environment vars). Example:
```
PORT=3000
GEMINI_API_KEY=           # Optional; if set, the project intends to use Google Gemini (AI integration is placeholder)
```

3. Development
```bash
npm run dev   # uses nodemon (if installed globally) or run `node server.js`
# or
npm start
```
Open http://localhost:3000 in a browser.

API: /api/underwrite
- Endpoint: POST /api/underwrite
- Content-Type: application/json
- Current server expects fields:
  - assetValue (number, e.g., 500000)
  - claimsHistory (integer, e.g., 0)
  - (optionally) assetType, assetAge — server logic ignores these currently, they are used in client fallback

Example curl (server-side endpoint):
```bash
curl -X POST http://localhost:3000/api/underwrite \
  -H "Content-Type: application/json" \
  -d '{"assetValue":500000,"claimsHistory":1,"assetType":"vehicle"}'
```

Example response (server fallback):
```json
{
  "success": true,
  "decision": "Approved",
  "riskLevel": "Low",
  "estimatedPremium": 10000,
  "currency": "NGN",
  "timestamp": "2026-08-09T..."
}
```

Known limitations (for academic honesty)
- The AI primary engine is a placeholder: the repo includes @google/generative-ai, but no active model invocation logic is implemented. A running Gemini API key is required for the intended AI flow.
- Field name mismatch: front-end uses `replacementValue` while the backend expects `assetValue`. Aligning these is recommended.
- No persistent storage: evaluations are not saved to a database.
- No comprehensive validation or security hardening (CORS is enabled broadly).
- No unit/integration tests included.

Future work & recommended improvements
- Implement AI request/response pipeline with structured schema validation & model response verification.
- Unify client/server field naming and centralize evaluation logic (to avoid duplicate, divergent logic).
- Add persistence (e.g., PostgreSQL) for auditability and result history.
- Add tests (Jest / supertest) and CI pipeline.
- Add Dockerfile and a simple deployment manifest for easier reproducible grading.

Project grading checklist (for professor)
- Dual-engine design demonstrated (AI planned + deterministic fallback: ✔)
- Frontend SPA with input and result display (✔)
- Deterministic fallback calculations are documented and reproducible (✔)
- Server exposes an API endpoint for underwriting (✔)
- Code is readable and well-structured for a prototype (✔)
- Limitations and future work documented (✔)

References
- public/app.js — client fallback logic & risk math
- server.js — server fallback endpoint
- package.json — dependencies & scripts

If you would like, I can:
- Add this README to the repository (create/commit) for you.
- Implement the Gemini API call or align input fields between client/server.
- Add a short demo script or test cases you can run during your presentation.
