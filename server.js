require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// -------------------------------------------------
// Supabase clients
// -------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// -------------------------------------------------
// Gemini
// -------------------------------------------------
const apiKey = process.env.GEMINI_API_KEY;
const genAI = (apiKey && apiKey !== 'your_google_gemini_api_key_here')
  ? new GoogleGenerativeAI(apiKey)
  : null;

if (genAI) console.log('🤖 Gemini AI ready');
else console.log('ℹ️ Gemini not configured – using actuarial fallback');

// -------------------------------------------------
// Auth helpers
// -------------------------------------------------
async function getUserFromToken(token) {
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function getProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    const passkey = req.headers['x-admin-passkey'] || req.body?.passkey;

    if (!token) return res.status(401).json({ error: 'Missing auth token' });
    if (!passkey || passkey !== process.env.ADMIN_PASSKEY) {
      return res.status(403).json({ error: 'Invalid admin passkey' });
    }

    const user = await getUserFromToken(token);
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    const profile = await getProfile(user.id);
    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    req.user = user;
    req.profile = profile;
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    res.status(500).json({ error: 'Auth check failed' });
  }
}

// -------------------------------------------------
// PUBLIC: Underwrite endpoint (same behaviour as before)
// -------------------------------------------------
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

Return ONLY a valid JSON object with no markdown:
{
  "decision": "Approved" | "Manual Review" | "Declined",
  "riskLevel": "Low" | "Medium" | "High",
  "riskScore": number_between_0_and_100,
  "multiplier": 1.0,
  "estimatedPremium": integer_calculated_premium,
  "aiAnalysis": "A short 1-2 sentence actuarial summary."
}`;

        const aiResponse = await model.generateContent(prompt);
        const textResponse = aiResponse.response.text();
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.decision) decision = parsed.decision;
          if (parsed.riskLevel) riskLevel = parsed.riskLevel;
          if (parsed.riskScore !== undefined) riskScore = parsed.riskScore;
          if (parsed.multiplier !== undefined) multiplier = parsed.multiplier;
          if (parsed.estimatedPremium) estimatedPremium = parsed.estimatedPremium;
          if (parsed.aiAnalysis) aiAnalysis = parsed.aiAnalysis;
          isAiEvaluated = true;
        }
      } catch (aiErr) {
        console.warn('Gemini fallback:', aiErr.message);
      }
    }

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

    // Save to Supabase
    const { data: inserted, error: dbErr } = await supabaseAdmin
      .from('evaluations')
      .insert({
        full_name: fullName,
        email,
        phone_number: phoneNumber,
        asset_type: assetType,
        asset_value: assetValue,
        asset_age: assetAge,
        claims_history: claimsHistory,
        decision,
        risk_level: riskLevel,
        risk_score: riskScore,
        multiplier: typeof multiplier === 'number' ? `${multiplier}x` : multiplier,
        estimated_premium: estimatedPremium,
        ai_analysis: aiAnalysis,
        is_ai_evaluated: isAiEvaluated,
        status: 'pending'
      })
      .select('id')
      .single();

    if (dbErr) console.warn('DB insert warning:', dbErr.message);

    return res.json({
      success: true,
      decision,
      riskLevel,
      riskScore,
      multiplier: typeof multiplier === 'number' ? `${multiplier}x` : multiplier,
      estimatedPremium,
      currency: 'NGN',
      isAiEvaluated,
      aiAnalysis,
      savedRecordId: inserted?.id || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Underwrite error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// -------------------------------------------------
// PUBLIC: List active companies
// -------------------------------------------------
app.get('/api/companies', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.json({ success: true, companies: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------
// AUTH helpers for frontend
// -------------------------------------------------
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || '' } }
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, user: data.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ error: error.message });

    const profile = await getProfile(data.user.id);
    res.json({
      success: true,
      session: data.session,
      user: data.user,
      profile
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------
// ADMIN: Applications
// -------------------------------------------------
app.get('/api/admin/applications', requireAdmin, async (req, res) => {
  try {
    const { status, risk_level, limit = 100 } = req.query;
    let query = supabaseAdmin
      .from('evaluations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (status) query = query.eq('status', status);
    if (risk_level) query = query.eq('risk_level', risk_level);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, applications: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/applications/:id', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('evaluations')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json({ success: true, application: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/applications/:id', requireAdmin, async (req, res) => {
  try {
    const { status, admin_notes } = req.body;
    const updates = {
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString()
    };
    if (status) updates.status = status;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;

    const { data, error } = await supabaseAdmin
      .from('evaluations')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, application: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------
// ADMIN: Companies
// -------------------------------------------------
app.get('/api/admin/companies', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    res.json({ success: true, companies: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/companies', requireAdmin, async (req, res) => {
  try {
    const {
      name, short_code, rating, description,
      specialties, logo_url, is_coming_soon, sort_order, is_active
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const { data, error } = await supabaseAdmin
      .from('companies')
      .insert({
        name,
        short_code: short_code || null,
        rating: rating || null,
        description: description || null,
        specialties: specialties || [],
        logo_url: logo_url || null,
        is_coming_soon: !!is_coming_soon,
        sort_order: sort_order || 0,
        is_active: is_active !== false
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, company: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/companies/:id', requireAdmin, async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id;

    const { data, error } = await supabaseAdmin
      .from('companies')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, company: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/companies/:id', requireAdmin, async (req, res) => {
  try {
    // Soft delete
    const { data, error } = await supabaseAdmin
      .from('companies')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, company: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------
// ADMIN: Users
// -------------------------------------------------
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, users: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/grant-admin', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin', updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/revoke-admin', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Prevent self-demotion
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot revoke your own admin role' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'user', updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------
// Start
// -------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 GoTrust running on http://localhost:${PORT}`);
  console.log(`   Admin dashboard → http://localhost:${PORT}/admin.html`);
});