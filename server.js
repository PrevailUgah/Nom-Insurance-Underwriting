require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Initialize PostgreSQL connection pool using Neon DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Neon cloud connections
});

// Automatically create database table on server startup if it doesn't exist
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_underwritings (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(50),
        asset_type VARCHAR(50),
        asset_value NUMERIC,
        asset_age INT,
        claims_history INT,
        decision VARCHAR(50),
        risk_level VARCHAR(50),
        estimated_premium NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Connected to Neon database and schema verified.');
  } catch (err) {
    console.error('❌ Database connection error:', err);
  }
}

initDb();

// Underwriting API Route with DB Persistence
app.post('/api/underwrite', async (req, res) => {
  try {
    const {
      fullName = '',
      email = '',
      phone = '',
      assetType = 'Vehicle',
      replacementValue = 100000,
      assetAge = 0,
      claimsHistory = 0
    } = req.body;

    const numericValue = Number(replacementValue) || 100000;
    const numericClaims = Number(claimsHistory) || 0;
    const numericAge = Number(assetAge) || 0;

    // Actuarial Fallback Logic
    let baseRate = 0.02;
    if (numericClaims > 2) baseRate += 0.015;
    
    const estimatedPremium = Math.round(numericValue * baseRate);
    
    let decision = 'Approved';
    let riskLevel = 'Low';

    if (numericClaims >= 3) {
      decision = 'Manual Review';
      riskLevel = 'High';
    } else if (numericClaims === 2) {
      riskLevel = 'Medium';
    }

    // Insert evaluation record into Neon PostgreSQL DB
    const insertQuery = `
      INSERT INTO customer_underwritings 
        (full_name, email, phone, asset_type, asset_value, asset_age, claims_history, decision, risk_level, estimated_premium)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, created_at;
    `;
    
    const dbResult = await pool.query(insertQuery, [
      fullName,
      email,
      phone,
      assetType,
      numericValue,
      numericAge,
      numericClaims,
      decision,
      riskLevel,
      estimatedPremium
    ]);

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

// Admin Route: Retrieve all past underwriting submissions
app.get('/api/underwritings', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customer_underwritings ORDER BY created_at DESC LIMIT 50;'
    );
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Fetch Error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve underwriting records' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
