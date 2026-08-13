require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Initialize PostgreSQL Connection Pool using Neon DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Neon cloud connections
});

// Create database table on server startup if it doesn't exist
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_underwritings (
        id SERIAL PRIMARY KEY,
        asset_value NUMERIC,
        claims_history INT,
        decision VARCHAR(50),
        risk_level VARCHAR(50),
        estimated_premium NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Successfully connected to Neon database and schema verified.');
  } catch (err) {
    console.error('❌ Database connection error:', err);
  }
}

initDb();

// Underwriting API Route with DB Persistence
app.post('/api/underwrite', async (req, res) => {
  try {
    // Front-end sends replacementValue; fall back to assetValue if provided
    const assetValue = Number(req.body.assetValue || req.body.replacementValue) || 100000;
    const claimsHistory = Number(req.body.claimsHistory) || 0;

    // Actuarial Fallback Logic
    let baseRate = 0.02;
    if (claimsHistory > 2) baseRate += 0.015;
    
    const estimatedPremium = Math.round(assetValue * baseRate);
    
    let decision = 'Approved';
    let riskLevel = 'Low';

    if (claimsHistory >= 3) {
      decision = 'Manual Review';
      riskLevel = 'High';
    } else if (claimsHistory === 2) {
      riskLevel = 'Medium';
    }

    // Insert record into Neon PostgreSQL DB
    const insertQuery = `
      INSERT INTO customer_underwritings (asset_value, claims_history, decision, risk_level, estimated_premium)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at;
    `;
    const dbResult = await pool.query(insertQuery, [assetValue, claimsHistory, decision, riskLevel, estimatedPremium]);

    res.json({
      success: true,
      decision,
      riskLevel,
      estimatedPremium,
      currency: 'NGN',
      savedRecordId: dbResult.rows[0].id,
      timestamp: dbResult.rows[0].created_at
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process underwriting decision' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
