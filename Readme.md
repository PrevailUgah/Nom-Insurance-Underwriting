# Nom P&C Insurance Underwriting 

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
insurance-underwriting-ai/
├── .env.example            # Environment variables template
├── package.json            # Node.js dependencies & scripts
├── server.js              # Express API server & Underwriting Engines (AI + Hardcoded)
└── public/
    ├── index.html          # SPA HTML structure & layout
    ├── styles.css          # Visual styling, cards, badges & responsive grid
    └── app.js              # DOM manipulation, AJAX calls & session history
```

---

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Google Gemini API Key** *(Optional - standard hardcoded actuarial fallback activates automatically if omitted)*

---

## Installation & Setup

### 1. Clone or Extract the Repository
```bash
mkdir insurance-underwriting-ai
cd insurance-underwriting-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and set your port and Gemini API Key:
```env
PORT=3000
GEMINI_API_KEY=your_actual_gemini_api_key_here
```
> **Note:** If `GEMINI_API_KEY` is left blank or omitted, the application will seamlessly operate using the **Hardcoded Actuarial Logic Engine**.

### 4. Start the Application
```bash
# Production mode
npm start

# Development mode
npm run dev
```

Navigate to **`http://localhost:3000`** in your browser.

---

## API Documentation

### `POST /api/underwrite`

Evaluates applicant asset risk and calculates base and dynamic final premiums.

#### Request Headers
`Content-Type: application/json`

#### Request Body
```json
{
  "assetType": "Vehicle",                 // "Vehicle" | "Property"
  "assetValue": 45000,                    // Replacement value in USD (number)
  "assetAge": 6,                          // Asset age in years (number)
  "environmentRisk": "Urban / High Traffic", // "Suburban / Low Risk" | "Urban / High Traffic" | "Rural / Isolated" | "Coastal / High Weather Risk"
  "previousClaims": 1,                    // Claims in last 5 years (number)
  "securityFeatures": true                // Active security/safety systems (boolean)
}
```

#### Successful Response (`200 OK`)
```json
{
  "success": true,
  "basePremium": 1800,
  "finalPremium": 2610,
  "assessment": {
    "riskScore": 45,
    "riskTier": "Medium",
    "approvalStatus": "Manual Review",
    "recommendedMultiplier": 1.45,
    "riskFactors": [
      "Urban density - Increased collision, theft, or liability risk",
      "1 prior claim on record - Standard surcharge applied",
      "Verified security/safety features present - Premium discount applied"
    ],
    "source": "AI Model" // or "Hardcoded Actuarial Logic"
  }
}
```

---

## Actuarial Scoring Logic Breakdown

The system computes risk based on standard Property & Casualty actuarial formulas:

### 1. Base Premium Formula
- **Vehicle:** `Asset Value * 4.0%`
- **Property:** `Asset Value * 0.3%`

### 2. Risk Factors & Multiplier Adjustments
| Factor | Condition | Score Impact | Multiplier Adjustment |
| :--- | :--- | :--- | :--- |
| **Asset Age** | > 10 years<br>> 20 years | +15 pts<br>+30 pts | +0.25x<br>+0.50x |
| **Environment** | Urban / High Traffic<br>Rural / Isolated<br>Coastal / Weather Hazard | +20 pts<br>+10 pts<br>+35 pts | +0.30x<br>+0.15x<br>+0.65x |
| **Claims History** | 1 claim<br>2+ claims | +20 pts<br>+45 pts | +0.30x<br>+0.85x |
| **Security Systems**| Installed / Active | -15 pts | -0.20x discount |
| **High Value** | Property > $1M<br>Vehicle > $100k | -- | +0.20x<br>+0.35x |

### 3. Risk Tiers & Decision Rules
- **Low Risk (Score 0 – 44):** `Approved` (Multiplier ~ 0.8x – 1.2x)
- **Medium Risk (Score 45 – 74):** `Manual Review` (Multiplier ~ 1.25x – 1.8x)
- **High Risk (Score 75 – 100):** `Declined` (Multiplier >= 2.0x)

---

## License

This project is open-source and released under the **MIT License**.
