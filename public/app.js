/**
 * Nom Insurance Underwriting Engine
 * Client-side script handling risk evaluation & database persistence via Render backend.
 */

// Global System State
const STATE = {
  isAiActive: true, // Route submissions to backend API
};

// DOM Element References
const form = document.getElementById('underwritingForm');
const modal = document.getElementById('aiModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const decisionBadge = document.getElementById('decisionBadge');
const riskScoreEl = document.getElementById('riskScore');
const multiplierEl = document.getElementById('multiplier');
const premiumEl = document.getElementById('calculatedPremium');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
});

/**
 * Main form submission handler
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  // Gather all input parameters matching form IDs
  const formData = {
    fullName: document.getElementById('fullName')?.value || '',
    email: document.getElementById('email')?.value || '',
    phone: document.getElementById('phone')?.value || '',
    assetType: document.getElementById('assetType')?.value || 'Vehicle',
    replacementValue: parseFloat(document.getElementById('replacementValue')?.value) || 0,
    assetAge: parseInt(document.getElementById('assetAge')?.value, 10) || 0,
    claimsHistory: parseInt(document.getElementById('claimsHistory')?.value, 10) || 0,
  };

  if (STATE.isAiActive) {
    await runAiEvaluation(formData);
  } else {
    showAiInactiveModal(() => {
      const evaluation = evaluateFallbackRisk(formData);
      renderResults(evaluation);
      if (form) form.reset();
    });
  }
}

/**
 * Sends form payload to Render Express backend & saves to Neon Database
 */
async function runAiEvaluation(data) {
  try {
    // Sends POST request to your live Render backend
    const response = await fetch('https://nom-insurance-backend.onrender.com/api/underwrite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      // Calculate risk score for UI display
      let score = 20 + data.assetAge * 3 + data.claimsHistory * 18;
      if (data.replacementValue > 100000) score += 15;
      const riskScore = Math.min(Math.max(score, 0), 100);

      // Determine badge class
      let badgeClass = 'status-approved';
      if (result.decision === 'Declined') badgeClass = 'status-declined';
      if (result.decision === 'Manual Review') badgeClass = 'status-review';

      // Format premium in NGN
      const formattedPremium =
        result.decision === 'Declined'
          ? 'N/A'
          : new Intl.NumberFormat('en-NG', {
              style: 'currency',
              currency: 'NGN',
            }).format(result.estimatedPremium);

      // Render backend response to screen
      renderResults({
        riskScore,
        status: result.decision,
        badgeClass,
        multiplier: result.riskLevel || 'Standard',
        premium: formattedPremium,
      });

      console.log('✅ Submission saved successfully to Neon DB. Record ID:', result.savedRecordId);
      
      // Reset input fields after successfully saving quote
      if (form) {
        form.reset();
      }
    } else {
      throw new Error(result.error || 'Underwriting calculation failed');
    }
  } catch (error) {
    console.error('Backend submission failed, falling back to local evaluation:', error);
    STATE.isAiActive = false;
    showAiInactiveModal(() => {
      renderResults(evaluateFallbackRisk(data));
      if (form) form.reset();
    });
  }
}

/**
 * Fallback Algorithmic Underwriting Engine (Offline local backup)
 */
function evaluateFallbackRisk(data) {
  let baseScore = 20;
  baseScore += data.assetAge * 3;
  baseScore += data.claimsHistory * 18;

  if (data.replacementValue > 100000) {
    baseScore += 15;
  } else if (data.replacementValue > 50000) {
    baseScore += 8;
  }

  const riskScore = Math.min(Math.max(baseScore, 0), 100);

  let status = 'Approved';
  let badgeClass = 'status-approved';
  let multiplierVal = 1.0;

  if (riskScore >= 75) {
    status = 'Declined';
    badgeClass = 'status-declined';
    multiplierVal = 0;
  } else if (riskScore >= 45) {
    status = 'Manual Review';
    badgeClass = 'status-review';
    multiplierVal = 1.45;
  } else {
    multiplierVal = 1 + (riskScore / 100) * 0.5;
  }

  const baseRate = 0.02;
  const rawPremium = data.replacementValue * baseRate * multiplierVal;

  const formattedPremium =
    status === 'Declined'
      ? 'N/A'
      : new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: 'NGN',
        }).format(rawPremium);

  return {
    riskScore,
    status,
    badgeClass,
    multiplier: status === 'Declined' ? 'N/A' : `${multiplierVal.toFixed(2)}x`,
    premium: formattedPremium,
  };
}

/**
 * Displays Modal Popup when AI / backend service is inactive
 */
function showAiInactiveModal(onConfirm) {
  if (!modal) {
    alert('Backend currently inactive, running local fallback evaluator.');
    onConfirm();
    return;
  }

  modal.classList.remove('hidden');
  const handleClose = () => {
    modal.classList.add('hidden');
    closeModalBtn.removeEventListener('click', handleClose);
    onConfirm();
  };
  closeModalBtn.addEventListener('click', handleClose);
}

/**
 * Updates UI Output Card with calculated metrics
 */
function renderResults(result) {
  if (decisionBadge) {
    decisionBadge.textContent = result.status;
    decisionBadge.className = `badge ${result.badgeClass}`;
  }
  if (riskScoreEl) {
    riskScoreEl.textContent = `${result.riskScore} / 100`;
  }
  if (multiplierEl) {
    multiplierEl.textContent = result.multiplier;
  }
  if (premiumEl) {
    premiumEl.textContent = result.premium;
  }
}
