# Nom-Insurance-Underwriting

An enterprise-grade, standalone Property and Casualty (P&C) Insurance Underwriting System built with Node.js, Express, Vanilla JavaScript, HTML5, and CSS3. 

The application evaluates physical asset risks (Vehicles and Properties), predicts claim probabilities, dynamic premium pricing multipliers, and real-time underwriting decisions (**Approved**, **Manual Review**, **Declined**).

---

## Key Features

- **Dual Engine Underwriting Architecture:**
  - **Primary AI Engine:** Powered by Google Gemini API (`gemini-1.5-flash`) with structured JSON schema enforcement for automated contextual risk scoring.
  - **Hardcoded Actuarial Fallback Engine:** Pure deterministic actuarial logic matrix that guarantees 100% system availability even if API keys are missing, invalid, or rate-limited.
- **Modern Dashboard UI:** Clean single-page application (SPA) with real-time evaluation loading feedback, visual risk badge indicators (Low / Medium / High), financial breakdowns, key risk drivers, and session audit history.
- **Asset-Centric Risk Scoring:** Built specifically for Vehicle (Auto) and Property (Real Estate) asset classes—factoring in asset age, market replacement value, environmental/location hazard levels, 5-year claims history, and verified security/safety systems.
- **Zero Heavy Frontend Framework Dependencies:** Lightweight vanilla JavaScript, pure semantic HTML5, and responsive CSS Grid/Flexbox design.

---

## Project Structure

```text
Nom-Insurance-Underwriting/
├── .env.example            # Environment variables template
├── package.json            # Node.js dependencies & scripts
├── server.js              # Express API server & Underwriting Engines (AI + Hardcoded)
└── public/
    ├── index.html          # SPA HTML structure & layout
    ├── styles.css          # Visual styling, cards, badges & responsive grid
    └── app.js              # DOM manipulation, AJAX calls & session history
