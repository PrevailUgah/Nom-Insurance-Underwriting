const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Enable CORS & JSON parsing middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Primary Underwriting API Endpoint
app.post('/api/underwrite', async (req, res) => {
  try {
    const formData = req.body;
    
    // Check if GEMINI_API_KEY is configured
    if (process.env.GEMINI_API_KEY) {
      // Primary AI Engine processing logic can be placed here
    }

    // Actuarial Fallback Scoring Engine
    const assetValue = parseFloat(formData.assetValue) || 100000;
    const claimsHistory = parseInt(formData.claimsHistory) || 0;
    
    let baseRate = 0.02;
    if (claimsHistory > 2) baseRate += 0.015;
    
    const estimatedPremium = Math.round(assetValue * baseRate);
    let riskLevel = 'Low';
    let decision = 'Approved';

    if (claimsHistory >= 3) {
      riskLevel = 'High';
      decision = 'Manual Review';
    } else if (claimsHistory === 2) {
      riskLevel = 'Medium';
    }

    return res.json({
      success: true,
      decision,
      riskLevel,
      estimatedPremium,
      currency: 'NGN',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing underwriting request:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// SPA Catch-All Route: serves index.html for unhandled routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dynamic Port and Host Binding required for Render deployment
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
