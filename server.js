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
 * Fallback Actuarial Risk Engine (Property & Vehicle)
 * Computes risk deterministically if AI is unavailable.
 */
function calculateFallbackRisk(data) {
    let score = 10; // Base score
    const factors = [];
    let multiplier = 1.0;

    // Asset Age rules
    if (data.assetAge > 15) { 
        score += 25; 
        factors.push(`Aging asset (${data.assetAge} years old) increases maintenance and failure risk`); 
        multiplier += 0.4; 
    } else if (data.assetAge > 5) { 
        score += 10; 
        factors.push("Moderate asset depreciation"); 
        multiplier += 0.15; 
    }

    // Location / Environmental Risk
    if (data.environmentRisk === 'Coastal / High Weather Risk') { 
        score += 35; 
        factors.push("High environmental/weather hazard zone"); 
        multiplier += 0.6; 
    } else if (data.environmentRisk === 'Urban / High Traffic') { 
        score += 20; 
        factors.push("Urban area (higher collision/theft probability)"); 
        multiplier += 0.3; 
    }

    // Previous Claims
    if (data.previousClaims === 1) { 
        score += 20; 
        factors.push("History of 1 recent claim"); 
        multiplier += 0.3; 
    } else if (data.previousClaims > 1) { 
        score += 45; 
        factors.push(`High frequency of past claims (${data.previousClaims})`); 
        multiplier += 0.8; 
    }

    // Mitigating Factors
    if (data.securityFeatures) { 
        score -= 15; 
        factors.push("Active security/safety systems present (Risk mitigated)"); 
        multiplier -= 0.2; 
    }

    // Coverage scaling (High-value asset risk)
    if (data.assetValue > 1000000 && data.assetType === 'Property') { 
        factors.push("High-value property requires specialized coverage limit"); 
        multiplier += 0.2; 
    } else if (data.assetValue > 80000 && data.assetType === 'Vehicle') {
        factors.push("Luxury/High-value vehicle repair costs are elevated"); 
        multiplier += 0.25;
    }

    // Cap score boundaries
    score = Math.max(0, Math.min(score, 100));

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
        riskFactors: factors.length > 0 ? factors : ["Standard asset risk profile"],
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
        
        // Base rate differs by asset type
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
                Calculate a recommended premium multiplier (e.g., 0.8 for excellent risk, 1.0 for standard, 1.5 for Medium, 2.5+ for High).
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
                console.error("AI Generation failed, falling back to heuristic engine:", aiError);
                riskAssessment = calculateFallbackRisk(assetData);
                riskAssessment.source = "Heuristic Fallback";
            }
        } else {
            riskAssessment = calculateFallbackRisk(assetData);
            riskAssessment.source = "Heuristic Fallback";
        }

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
});