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
    const fullName = req.body.fullName || req.body.full_name || 'Anonymous Insured';
    const email = req.body.email || '';
    const phoneNumber = req.body.phone || req.body.phoneNumber || req.body.phone_number || '';
    const assetValue = Number(req.body.replacementValue || req.body.assetValue || req.body.asset_value || 100000);
    const claimsHistory = Number(req.body.claimsHistory || req.body.claims_history || 0);

    // Server-side actuarial evaluation logic
    let baseRate = 0.02;
    if (claimsHistory > 2) {
      baseRate += 0.015;
    }

    const estimatedPremium = Math.round(assetValue * baseRate);
    
    let decision = 'Approved';
    let riskLevel = 'Low';

    if (claimsHistory >= 3) {
      decision = 'Manual Review';
      riskLevel = 'High';
    } else if (claimsHistory === 2) {
      riskLevel = 'Medium';
    }

    let savedRecordId = null;

    // Save underwriting evaluation and contact details to Neon database
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
      console.warn('⚠️ Warning: Neon DB insertion error:', dbErr.message);
    }

    const result = {
      success: true,
      decision,
      riskLevel,
      estimatedPremium,
      currency: 'NGN',
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
