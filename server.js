require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// -----------------------------------------------------------------------------
// Neon PostgreSQL Database Setup
// -----------------------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon SSL connection
  },
});

// Test Database Connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to Neon Database:', err.stack);
  } else {
    console.log('⚡ Successfully connected to Neon PostgreSQL Database!');
    release();
  }
});

// -----------------------------------------------------------------------------
// Underwriting Endpoint
// -----------------------------------------------------------------------------
app.post('/api/underwrite', async (req, res) => {
  try {
    const { assetValue = 100000, claimsHistory = 0, assetType, assetAge } = req.body;

    // Server-side actuarial fallback logic
    let baseRate = 0.02;
    if (Number(claimsHistory) > 2) {
      baseRate += 0.015;
    }

    const estimatedPremium = Math.round(Number(assetValue) * baseRate);
    
    let decision = 'Approved';
    let riskLevel = 'Low';

    if (Number(claimsHistory) >= 3) {
      decision = 'Manual Review';
      riskLevel = 'High';
    } else if (Number(claimsHistory) === 2) {
      riskLevel = 'Medium';
    }

    const result = {
      success: true,
      decision,
      riskLevel,
      estimatedPremium,
      currency: 'NGN',
      timestamp: new Date().toISOString()
    };

    /* 
    OPTIONAL: Save underwriting evaluation to Neon database
    await pool.query(
      `INSERT INTO evaluations (asset_value, claims_history, decision, risk_level, estimated_premium, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [assetValue, claimsHistory, decision, riskLevel, estimatedPremium]
    );
    */

    return res.json(result);
  } catch (error) {
    console.error('Error processing underwriting:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
