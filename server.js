require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Gemini API if key is present
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

/**
 * HARDCODED PREMIUM SCORING ENGINE
 * This deterministic logic serves as the standalone pricing model if the AI is unavailable.
 */
function calculateHardcodedPremium(data) {
    let score = 10; 
    const factors = [];
    let multiplier = 1.0;

    // 1. Asset Age Hardcoded Rules
    if (data.assetAge > 20) { 
        score += 30; 
        factors.push(`Severe asset age (${data.assetAge} yrs) - High structural/mechanical failure risk`); 
        multiplier += 0.50; 
    } else if (data.assetAge > 10) { 
        score += 15; 
        factors.push(`Aging asset (${data.assetAge} yrs) - Moderate wear and tear factored`); 
        multiplier += 0.25; 
    }

    // 2. Location & Environmental Hardcoded Rules
    switch (data.environmentRisk) {
        case 'Coastal / High Weather Risk':
            score += 35;
            factors.push("Coastal/Weather risk zone - High probability of catastrophic loss");
            multiplier += 0.65;
            break;
        case 'Urban / High Traffic':
            score += 20;
            factors.push("Urban density - Increased collision, theft, or liability risk");
            multiplier += 0.30;
            break;
        case 'Rural / Isolated':
            score += 10;
            factors.push("Isolated location - Delayed emergency response times");
            multiplier += 0.15;
            break;
        default:
            factors.push("Standard suburban environment risk");
            break;
    }

    // 3. Claims History Hardcoded Rules
    if (data.previousClaims === 1) { 
        score += 20; 
        factors.push("1 prior claim on record - Standard surcharge applied"); 
        multiplier += 0.30; 
    } else if (data.previousClaims >= 2) { 
        score += 45; 
        factors.push(`High claims frequency (${data.previousClaims} claims) - Severe risk indicator`); 
        multiplier += 0.85; 
    }

    // 4. Security System Mitigation
    if (data.securityFeatures) { 
        score -= 15; 
        factors.push("Verified security/safety features present - Premium discount applied"); 
        multiplier -= 0.20; 
    } else {
        factors.push("No active security features noted");
    }

    // 5. High-Value Asset Scaling
    if (data.assetType === 'Property' && data.assetValue > 1000000) { 
        factors.push("Jumbo property policy - Specialized replacement costs factored"); 
        multiplier += 0.20; 
    } else if (data.assetType === 'Vehicle' && data.assetValue > 100000) {
        factors.push("Luxury/Exotic vehicle - High parts and repair costs factored"); 
        multiplier += 0.35;
    }

    // Determine Status and Tier based on final hardcoded score
    score = Math.max(0, Math.min(score, 100)); // Clamp between 0-100

    let tier = 'Low';
    let status = 'Approved';

    if (score >= 75) {
        tier = 'High';
        status = 'Declined';
    } else if (score >= 45) {
        tier = 'Medium';
        status = 'Manual Review';
    }

    return {
        riskScore: score,
        approvalStatus: status,
        riskFactors: factors,
        recommendedMultiplier: parseFloat(multiplier.toFixed(2)),
        riskTier: tier
    };
}

/**
 * API Endpoint: POST /api/underwrite
 */
app.post('/api/underwrite', async (req, res) => {
    try {
        const assetData = req.body;
        
        // Hardcoded Base Rates: Auto is typically 4% of value, Property is typically 0.3% of value annually
        const baseRate = assetData.assetType === 'Vehicle' ? 0.04 : 0.003; 
        const basePremium = assetData.assetValue * baseRate; 

        let riskAssessment;

        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: "gemini-1.5-flash",
                    generationConfig: { responseMimeType: "application/json" }
                });

                const prompt = `
                You are an expert Property and Casualty (P&C) insurance underwriting AI. 
                Evaluate the following asset data and return a JSON object with your risk assessment.
                
                Asset Data:
                - Asset Type: ${assetData.assetType}
                - Asset Value: $${assetData.assetValue}
                - Asset Age: ${assetData.assetAge} years
                - Environment/Location: ${assetData.environmentRisk}
                - Previous Claims (Last 5 Years): ${assetData.previousClaims}
                - Security/Safety Systems Installed: ${assetData.securityFeatures ? 'Yes' : 'No'}
                
                Calculate a risk score (0-100) and determine the risk tier (Low, Medium, High).
                Based on the tier, set approvalStatus to "Approved" (Low), "Manual Review" (Medium), or "Declined" (High).
                Calculate a recommended premium multiplier based on the risk factors (e.g., 0.8 for excellent risk with security, 1.0 for standard, 1.5 for Medium, 2.5+ for High).
                List 3-4 key risk factors explaining the structural, environmental, or historical risks of this specific asset.
                
                You must respond in strict JSON matching exactly this schema:
                {
                    "riskScore": number,
                    "riskTier": "Low" | "Medium" | "High",
                    "approvalStatus": "Approved" | "Manual Review" | "Declined",
                    "recommendedMultiplier": number,
                    "riskFactors": string[]
                }`;

                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                riskAssessment = JSON.parse(responseText);
                riskAssessment.source = "AI Model";

            } catch (aiError) {
                console.error("AI API failed, immediately falling back to hardcoded pricing logic:", aiError);
                riskAssessment = calculateHardcodedPremium(assetData);
                riskAssessment.source = "Hardcoded Actuarial Logic";
            }
        } else {
            // No API key provided, route entirely through hardcoded logic
            riskAssessment = calculateHardcodedPremium(assetData);
            riskAssessment.source = "Hardcoded Actuarial Logic";
        }

        // Final Dynamic Premium Calculation
        const finalPremium = basePremium * riskAssessment.recommendedMultiplier;

        res.json({
            success: true,
            basePremium: basePremium,
            finalPremium: finalPremium,
            assessment: riskAssessment
        });

    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ success: false, error: "Internal Server Error during underwriting." });
    }
});

app.listen(PORT, () => {
    console.log(`Property & Vehicle Underwriting AI Server running on http://localhost:${PORT}`);
    if (!process.env.GEMINI_API_KEY) {
        console.warn("WARNING: No GEMINI_API_KEY found. System will run on Hardcoded Actuarial Logic.");
    }
});
