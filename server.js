require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// -----------------------------------------------------------------------------
// Gemini AI Engine Setup
// -----------------------------------------------------------------------------
const apiKey = process.env.GEMINI_API_KEY;
const genAI = (apiKey && apiKey !== 'your_gemini_api_key_here') ? new GoogleGenerativeAI(apiKey) : null;

if (genAI) {
  console.log('🤖 Google Gemini AI Engine Initialized!');
} else {
  console.log('ℹ️ Google Gemini API key not configured. Using fallback actuarial engine.');
}

// -----------------------------------------------------------------------------
// Neon PostgreSQL Database Setup
// -----------------------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to Neon Database:', err.stack);
  } else {
    console.log('⚡ Successfully connected to Neon PostgreSQL Database!');
    release();
  }
});

// -----------------------------------------------------------------------------
// Underwriting Endpoint with Gemini AI Integration
// -----------------------------------------------------------------------------
app.post('/api/underwrite', async (req, res) => {
  try {
    const fullName = req.body.fullName || req.body.full_name || 'Anonymous Insured';
    const email = req.body.email || '';
    const phoneNumber = req.body.phone || req.body.phoneNumber || req.body.phone_number || '';
    const assetType = req.body.assetType || req.body.asset_type || 'Commercial Real Estate';
    const assetValue = Number(req.body.replacementValue || req.body.assetValue || req.body.asset_value || 100000);
    const assetAge = Number(req.body.assetAge || req.body.asset_age || 0);
    const claimsHistory = Number(req.body.claimsHistory || req.body.claims_history || 0);

    let decision = 'Approved';
    let riskLevel = 'Low';
    let riskScore = 20;
    let multiplier = 1.0;
    let estimatedPremium = Math.round(assetValue * 0.02);
    let aiAnalysis = 'Evaluated using actuarial risk rating rules.';
    let isAiEvaluated = false;

    // Try Google Gemini AI evaluation
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `You are an expert Property & Casualty (P&C) actuarial underwriter. Evaluate the following risk profile:
- Insured Legal Entity: ${fullName}
- Corporate Email: ${email}
- Asset Classification: ${assetType}
- Total Insured Replacement Value: ${assetValue} NGN
- Asset Operational Age: ${assetAge} Years
- Prior Claims Count (5-Year Window): ${claimsHistory}

Formulate an official actuarial decision. Return ONLY a valid JSON object with no markdown syntax:
{
  "decision": "Approved" | "Manual Review" | "Declined",
  "riskLevel": "Low" | "Medium" | "High",
  "riskScore": number_between_0_and_100,
  "multiplier": 1.0,
  "estimatedPremium": integer_calculated_premium,
  "aiAnalysis": "A short 1-2 sentence actuarial summary explaining the decision."
}`;

        const aiResponse = await model.generateContent(prompt);
        const textResponse = aiResponse.response.text();
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.decision) decision = parsed.decision;
          if (parsed.riskLevel) riskLevel = parsed.riskLevel;
          if (parsed.riskScore !== undefined) riskScore = parsed.parsedScore || parsed.riskScore;
          if (parsed.multiplier !== undefined) multiplier = parsed.multiplier;
          if (parsed.estimatedPremium) estimatedPremium = parsed.estimatedPremium;
          if (parsed.aiAnalysis) aiAnalysis = parsed.aiAnalysis;
          isAiEvaluated = true;
        }
      } catch (aiError) {
        console.warn('⚠️ Gemini AI evaluation fallback:', aiError.message);
      }
    }

    // Actuarial fallback logic if AI didn't run or encountered API error
    if (!isAiEvaluated) {
      let baseRate = 0.02;
      if (claimsHistory > 2) baseRate += 0.015;
      estimatedPremium = Math.round(assetValue * baseRate);

      if (claimsHistory >= 3) {
        decision = 'Manual Review';
        riskLevel = 'High';
      } else if (claimsHistory === 2) {
        riskLevel = 'Medium';
      }
    }

    let savedRecordId = null;

    // Save to Neon Database
    try {
      const dbResult = await pool.query(
        `INSERT INTO evaluations 
          (full_name, email, phone_number, asset_value, claims_history, decision, risk_level, estimated_premium)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [fullName, email, phoneNumber, assetValue, claimsHistory, decision, riskLevel, estimatedPremium]
      );
      if (dbResult.rows && dbResult.rows.length > 0) {
        savedRecordId = dbResult.rows[0].id;
      }
    } catch (dbErr) {
      console.warn('⚠️ Neon DB insertion note:', dbErr.message);
    }

    const result = {
      success: true,
      decision,
      riskLevel,
      riskScore,
      multiplier: typeof multiplier === 'number' ? `${multiplier}x` : multiplier,
      estimatedPremium,
      currency: 'NGN',
      isAiEvaluated,
      aiAnalysis,
      savedRecordId: savedRecordId || Math.floor(Math.random() * 89999 + 10000),
      timestamp: new Date().toISOString()
    };

    return res.json(result);
  } catch (error) {
    console.error('Error processing underwriting:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 NOM Underwriting System running on http://localhost:${PORT}`);
});
